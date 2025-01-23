import importlib.util
import sys
from pathlib import Path


def load_benchmark_module(module_path, class_name):
    """
    Dynamically load a class from a given Python module
    """
    
    try:
        # Ensure the module path exists
        module_path = Path(module_path)
        if not module_path.exists():
            raise FileNotFoundError(f"Module file '{module_path}' not found.")

        # Add the parent directory of the module to sys.path
        sys.path.append(str(module_path.parent))

        # Create a module specification
        spec = importlib.util.spec_from_file_location(module_path.stem, module_path)
        if spec is None:
            raise ImportError(f"Could not create a module specification for '{module_path}'.")

        # Load the module
        module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
        except Exception as e:
            raise ImportError(f"Error while executing the module '{module_path}': {e}")


        # Retrieve the class from the module
        try:
            cls = getattr(module, class_name)
        except AttributeError:
            raise AttributeError(f"Class '{class_name}' not found in module '{module_path}'.")

        return cls

    except Exception as e:
        raise RuntimeError(f"Failed to load the benchmark module '{module_path}' with class '{class_name}': {e}")
