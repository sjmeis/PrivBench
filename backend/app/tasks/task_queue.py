from .. import celery

@celery.task
def train_model_task(data):
    # Simulate a model training process here
    print("Training model with data:", data)
    return "Model training completed"
