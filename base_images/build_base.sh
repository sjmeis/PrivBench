#!/bin/bash

sudo docker build -t privbench-base-cpu:latest -f Dockerfile.cpu .

sudo docker build -t privbench-base-gpu:latest -f Dockerfile.gpu .
