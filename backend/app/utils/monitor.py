# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import psutil
import threading
import time
import logging

try:
    import pynvml
    pynvml.nvmlInit()
    HAS_GPU = True
except Exception:
    HAS_GPU = False

logger = logging.getLogger(__name__)

# Global object to store stats
system_stats = {
    "cpu": 0,
    "memory": 0,
    "storage": 0,
    "gpu": None,
    "last_updated": None
}

def update_stats_loop():
    """Background loop to update system metrics."""
    global system_stats
    while True:
        try:
            # CPU
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory().percent
            disk = psutil.disk_usage('/').percent

            gpu_data = None
            if HAS_GPU:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    gpu_data = {
                        "load": util.gpu,
                        "memory": round((mem_info.used / mem_info.total) * 100, 2),
                        "temp": pynvml.nvmlDeviceGetTemperature(handle, 0)
                    }
                except Exception as e:
                    logger.error(f"GPU Poll Error: {e}")

            system_stats.update({
                "cpu": cpu,
                "memory": mem,
                "storage": disk,
                "gpu": gpu_data,
                "last_updated": time.time()
            })
        except Exception as e:
            logger.error(f"Monitoring Loop Error: {e}")
        
        time.sleep(2)

def start_monitor():
    """Starts the background thread."""
    thread = threading.Thread(target=update_stats_loop, daemon=True)
    thread.start()