from flask import current_app
import os
import importlib.util
from pathlib import Path

class ModuleInitializer:
    """Service to initialize benchmark modules at app startup"""
    
    @staticmethod
    def initialize_modules():
        """Load and initialize all benchmark modules"""
        # Get the project root directory (3 levels up from this file)
        PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
        MODULES_FOLDER = os.path.join(PROJECT_ROOT, "modules")
        
        if not os.path.exists(MODULES_FOLDER):
            current_app.logger.warning(f"Modules folder not found at {MODULES_FOLDER}")
            return
            
        module_files = [f for f in os.listdir(MODULES_FOLDER) 
                       if f.endswith('.py') and not f.startswith('__')]
                       
        loaded_modules = {}
        
        for module_file in module_files:
            try:
                module_path = os.path.join(MODULES_FOLDER, module_file)
                module_name = module_file[:-3]  # Remove .py extension
                
                current_app.logger.info(f"Loading module: {module_name} from {module_path}")
                
                # Load module
                spec = importlib.util.spec_from_file_location(module_name, module_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Initialize module class
                module_class = getattr(module, module_name)
                module_instance = module_class()
                
                loaded_modules[module_name] = module_instance
                current_app.logger.info(f"Successfully initialized module: {module_name}")
                
            except Exception as e:
                current_app.logger.error(f"Failed to initialize module {module_file}: {str(e)}")
                
        # Store loaded modules in app context
        current_app.benchmark_modules = loaded_modules