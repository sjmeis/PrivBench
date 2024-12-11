from app.utils.module_loader import load_benchmark_module
from app.utils.dataset_loader import load_dataset
from celery.utils.log import get_task_logger
import pandas as pd

logger = get_task_logger(__name__)

def run_benchmark(module_path, module_name, dataset_path, priv_dataset_path):
    """
    Run a benchmark module with the specified datasets.
    
    This is a generic benchmark runner that can work with any benchmark module that:
    1. Has a class matching module_name
    2. Implements the score(original_data, privatized_data) method
    3. Returns a float between 0 and 1 (or 0-100 which will be normalized)
    
    Args:
        module_path (str): Path to the benchmark module file
        module_name (str): Name of the benchmark class in the module
        dataset_path (str): Path to the original dataset
        priv_dataset_path (str): Path to the privatized dataset
        
    Returns:
        float: Normalized score between 0 and 1
    """
    logger.info(f"Starting benchmark execution for module {module_name}")
    try:
        # Load the benchmark class
        logger.info(f"Loading benchmark module from {module_path}")
        try:
            BenchmarkModule = load_benchmark_module(module_path, module_name)
            logger.info(f"Successfully loaded module: {BenchmarkModule}")
        except Exception as e:
            logger.error(f"Failed to load module '{module_name}': {e}")
            raise Exception(f"Failed to load module '{module_name}': {e}")

        # Create an instance of the benchmark class
        try:
            benchmark_instance = BenchmarkModule()
            logger.info("Successfully created benchmark instance")
        except Exception as e:
            logger.error(f"Failed to initialize benchmark instance: {e}")
            raise Exception(f"Failed to initialize benchmark instance: {e}")

        # Load and validate the datasets
        try:
            dataset = load_dataset(dataset_path)
            privatized_dataset = load_dataset(priv_dataset_path)
            
            if dataset.shape != privatized_dataset.shape:
                raise ValueError(
                    f"Dataset shapes don't match: original {dataset.shape} vs "
                    f"privatized {privatized_dataset.shape}"
                )
            
            logger.info(f"Loaded datasets - Shape: {dataset.shape}")
            
        except Exception as e:
            logger.error(f"Dataset loading/validation failed: {e}")
            raise Exception(f"Dataset loading/validation failed: {e}")

        # Compute the benchmark score
        logger.info("Computing benchmark score")
        try:
            score = benchmark_instance.score(dataset, privatized_dataset)
            
            if score is None:
                raise ValueError("Benchmark returned None score")
                
            # Handle both 0-1 and 0-100 score ranges
            if score > 1:
                score = float(score) / 100.0
                
            if not 0 <= score <= 1:
                raise ValueError(f"Score {score} is outside valid range [0, 1]")
                
            logger.info(f"Successfully computed score: {score}")
            return score

        except Exception as e:
            logger.error(f"Score computation failed: {e}")
            raise Exception(f"Score computation failed: {e}")

    except Exception as main_error:
        logger.error(f"Benchmark execution failed: {main_error}")
        raise RuntimeError(f"Benchmark execution failed: {main_error}")