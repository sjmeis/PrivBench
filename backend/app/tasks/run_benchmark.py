from app.utils.module_loader import load_benchmark_module
from app.utils.dataset_loader import load_dataset

def run_benchmark(module_path, module_name, dataset_path, priv_dataset_path):
    try:
        # Load the benchmark class
        try:
            BenchmarkModule = load_benchmark_module(module_path, module_name)
        except Exception as e:
            raise Exception(f"Unexpected error while loading module '{module_name}': {e}")

        # Create an instance of the benchmark class
        try:
            benchmark_instance = BenchmarkModule()
        except AttributeError as e:
            raise AttributeError(f"The loaded module '{module_name}' does not have a callable class: {e}")
        except Exception as e:
            raise Exception(f"Unexpected error while initializing benchmark instance: {e}")

        # Load the datasets
        try:
            dataset = load_dataset(dataset_path)
        except FileNotFoundError as e:
            raise FileNotFoundError(f"Dataset file not found at path '{dataset_path}': {e}")
        except Exception as e:
            raise Exception(f"Unexpected error while loading dataset from '{dataset_path}': {e}")

        try:
            privatized_dataset = load_dataset(priv_dataset_path)
        except FileNotFoundError as e:
            raise FileNotFoundError(f"Privatized dataset file not found at path '{priv_dataset_path}': {e}")
        except Exception as e:
            raise Exception(f"Unexpected error while loading privatized dataset from '{priv_dataset_path}': {e}")

        # Compute the benchmark score
        try:
            score = benchmark_instance.score(dataset, privatized_dataset)
        except AttributeError as e:
            raise AttributeError(f"The benchmark instance does not have a 'score' method: {e}")
        except Exception as e:
            raise Exception(f"Unexpected error during scoring: {e}")

        return score

    except Exception as main_error:
        # Log the error or re-raise with additional context
        raise RuntimeError(f"Error running benchmark: {main_error}")
