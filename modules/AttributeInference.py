import torch
import pandas as pd
from transformers import pipeline
from sklearn.metrics import f1_score
import json
import os
import gc

from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


@with_progress_tracking
class AttributeInference(BaseBenchmark):
    """
    Benchmark module for attribute inference / authorship attacks.

    Idea:
        - Use a pretrained text classifier as the *attacker* (e.g., age/gender/
          author ID, or in simple demos, sentiment or domain).
        - Run the attacker on the original texts and on the privatized texts.
        - Measure how often the predicted attributes agree between original and
          privatized texts (F1 / accuracy).

    Intuition:
        - If privatization preserves implicit attributes well (bad for privacy),
          the classifier predictions will agree frequently -> high adversarial F1
        - If privatization obfuscates attributes (good for privacy), predictions
          will change more often -> lower adversarial F1

    This module returns a score in [0, 100] where *higher* means *better privacy*,
    i.e., lower agreement between attacker predictions on original vs. private.
    """

    DATASET_CONFIGS = {
        "yelp": {
            "model": "sjmeis/yelp_authorship_small",
            "label_path": "/app/authorship_labels_yelp.json",
             "gallback_labels": [9, 0, 6, 0, 3, 0, 5, 0, 3, 2, 7, 2, 5, 9, 3, 7, 0, 6, 8, 4, 1, 6, 5, 1, 0, 5, 0, 2, 9, 6, 0, 4, 2, 6, 4, 1, 6, 1, 8, 0, 1, 0, 0, 0, 1, 3, 5, 6, 6, 7, 6, 3, 3, 4, 4, 0, 0, 3, 0, 0, 7, 0, 0, 2, 1, 1, 3, 4, 8, 4, 0, 8, 2, 6, 7, 3, 0, 6, 5, 4, 2, 4, 0, 9, 2, 5, 9, 3, 0, 0, 5, 2, 1, 6, 7, 1, 2, 0, 2, 2, 5, 9, 0, 0, 6, 5, 6, 4, 7, 3, 2, 9, 4, 8, 4, 9, 0, 9, 3, 2, 1, 7, 2, 7, 1, 5, 4, 4, 0, 0, 9, 3, 2, 8, 7, 0, 0, 3, 6, 4, 2, 0, 5, 6, 4, 2, 9, 3, 9, 6, 2, 6, 7, 6, 8, 9, 9, 1, 7, 8, 3, 3, 8, 3, 5, 6, 0, 1, 8, 7, 1, 5, 5, 7, 4, 8, 6, 9, 9, 7, 2, 5, 0, 0, 0, 5, 4, 6, 0, 3, 3, 2, 2, 8, 9, 3, 5, 1, 4, 2, 1, 5, 6, 5, 5, 1, 9, 2, 5, 4, 0, 7, 4, 9, 0, 0, 6, 5, 2, 5, 6, 9, 2, 7, 2, 6, 3, 2, 2, 7, 6, 2, 5, 1, 8, 0, 5, 9, 0, 5, 2, 0, 9, 6, 1, 9, 7, 2, 3, 1, 2, 0, 3, 6, 8, 9, 2, 6, 6, 3, 5, 6, 3, 2, 1, 4, 0, 3, 4, 3, 7, 7, 0, 8, 4, 0, 7, 1, 2, 2, 8, 7, 3, 7, 6, 0, 2, 2, 3, 1, 4, 0, 0, 4, 5, 0, 5, 4, 6, 7, 4, 7, 6, 0, 5, 2, 8, 5, 3, 1, 6, 9, 2, 4, 1, 3, 5, 2, 2, 5, 7, 9, 4, 5, 2, 1, 7, 4, 5, 0, 4, 2, 5, 0, 6, 8, 8, 0, 0, 1, 0, 8, 4, 2, 0, 1, 1, 5, 1, 5, 7, 3, 0, 6, 1, 0, 0, 2, 8, 1, 3, 5, 7, 8, 6, 7, 5, 0, 0, 6, 2, 3, 3, 6, 1, 2, 2, 7, 6, 7, 0, 7, 4, 9, 5, 4, 1, 7, 2, 4, 8, 0, 3, 5, 4, 8, 0, 8, 0, 8, 9, 5, 4, 0, 6, 8, 6, 8, 3, 2, 6, 0, 0, 0, 0, 2, 5, 0, 5, 5, 9, 9, 1, 2, 4, 5, 6, 1, 5, 0, 2, 6, 0, 8, 3, 2, 8, 2, 5, 1, 7, 2, 7, 1, 2, 4, 1, 8, 6, 4, 6, 4, 4, 4, 9, 1, 1, 3, 7, 3, 1, 0, 4, 1, 5, 3, 9, 0, 0, 2, 1, 2, 2, 0, 2, 6, 7, 7, 3, 2, 1, 9, 9, 3, 5, 9, 0, 4, 2, 7, 0, 6, 5, 7, 8, 4, 5, 3, 2, 0, 7, 1, 9, 3, 4, 3, 6, 6, 8, 1, 5, 8, 2, 2, 7, 0, 5, 4, 7, 2, 8, 2, 7, 5, 0, 8, 4, 6, 1, 4, 3, 1, 7, 6, 0, 6, 7, 3, 3, 2, 1, 4, 0, 5, 0, 5, 1, 2, 6, 9, 3, 1, 9, 6, 5, 1, 8, 0, 6, 7, 6, 4, 4, 0, 0, 8, 7, 1, 1, 1, 7, 5, 0, 0, 5, 4, 2, 8, 1, 9, 6, 0, 6, 1, 4, 0, 0, 4, 6, 0, 3, 1, 6, 1, 2, 9, 6, 9, 7, 0, 0, 6, 0, 0, 7, 1, 3, 3, 0, 6, 2, 9, 3, 3, 4, 0, 2, 0, 9, 5, 6, 7, 0, 2, 8, 4, 9, 3, 4, 4, 4, 3, 5, 8, 5, 4, 5, 0, 3, 5, 4, 6, 1, 5, 4, 1, 5, 0, 1, 7, 5, 8, 4, 1, 5, 7, 5, 0, 9, 1, 0, 0, 3, 7, 5, 0, 1, 4, 7, 4, 5, 7, 0, 7, 0, 0, 2, 2, 3, 4, 1, 8, 1, 9, 0, 0, 5, 1, 5, 9, 4, 5, 2, 4, 2, 5, 0, 0, 9, 6, 2, 3, 8, 2, 2, 5, 3, 2, 0, 5, 4, 3, 0, 3, 0, 5, 8, 8, 0, 0, 4, 3, 0, 5, 2, 2, 0, 7, 4, 0, 0, 2, 4, 6, 0, 7, 1, 8, 6, 2, 0, 6, 3, 0, 3, 3, 1, 2, 5, 8, 1, 6, 0, 9, 4, 8, 3, 9, 5, 5, 0, 4, 0, 3, 3, 0, 9, 3, 8, 8, 4, 1, 2, 4, 6, 1, 9, 4, 8, 1, 6, 1, 8, 0, 8, 6, 1, 2, 1, 0, 8, 1, 3, 3, 7, 8, 4, 6, 0, 5, 0, 2, 1, 5, 5, 6, 4, 4, 8, 5, 8, 4, 0, 0, 5, 1, 8, 0, 3, 1, 3, 1, 0, 0, 2, 8, 5, 6, 0, 6, 1, 1, 3, 0, 6, 3, 2, 9, 2, 5, 9, 4, 2, 0, 8, 4, 3, 2, 3, 4, 1, 1, 9, 0, 9, 8, 4, 6, 6, 4, 7, 9, 7, 5, 8, 7, 0, 6, 8, 0, 3, 4, 7, 0, 4, 0, 6, 9, 4, 0, 8, 0, 8, 5, 0, 6, 2, 0, 9, 4, 1, 9, 1, 1, 1, 8, 2, 2, 0, 0, 2, 0, 6, 3, 4, 5, 5, 2, 0, 7, 2, 6, 0, 0, 3, 7, 0, 0, 3, 1, 4, 4, 9, 0, 7, 6, 5, 1, 1, 0, 1, 3, 2, 9, 0, 2, 2, 1, 0, 2, 7, 0, 9, 7, 1, 0, 0, 0, 0, 8, 4, 1, 2, 4, 9, 7, 9, 2, 8, 0, 1, 1, 0, 5, 4, 0, 4, 8, 2, 2, 9, 9, 9, 5, 9, 2, 0, 8, 9, 0, 3, 1, 4, 3, 9, 8, 3, 5, 0, 5, 0, 3, 9, 6, 4, 8, 1, 4, 1, 2]

        },
        "reddit": {
            "model": "sjmeis/reddit-mental-health_authorship",
            "label_path": "/app/authorship_labels_blogs.json",
            "fallback_labels": ['Right_now78', 'AspiringBiotech', 'RockyK96', 'carter_pride', 'Right_now78', 'Lizziemaughan17x', 'AspiringBiotech', 'RockyK96', 'Competitive_Bid7071', 'littledaisy_07', 'Ogenz', 'BlueAzzure', 'Terra246', 'urbanracer34', 'BBlank223', 'No-Watercress-9116', 'FaithInStrangers94', 'Ogenz', 'OllieCad', 'pleaseimconfused', 'shadowXXe', 'BBlank223', 'massivesmoke', 'AspiringBiotech', 'New_Shoe9530', 'Altruistic_System_41', 'SpektrumKid', 'SpektrumKid', 'massivesmoke', 'massivesmoke', 'urbanracer34', 'tgott1686', 'MycologistAdvanced24', 'urbanracer34', 'AspiringBiotech', 'BlueAzzure', 'turquoiseturtle01', 'RockyK96', 'Sommet_', 'Master-Champion-1528', 'Right_now78', 'urbanracer34', 'SlipInternational593', 'urbanracer34', 'PeteyZee1998', 'RockyK96', 'Elusive-Yoda', 'tgott1686', 'No-Watercress-9116', 'Lizziemaughan17x', 'mickNcheez', 'BBlank223', 'Elusive-Yoda', 'joost666', 'MycologistAdvanced24', 'Lizziemaughan17x', 'urbanracer34', 'turquoiseturtle01', 'foooood4thought', 'New_Shoe9530', 'AspiringBiotech', 'MycologistAdvanced24', 'purple07631', 'No-Watercress-9116', 'FaithInStrangers94', 'Alternative-Jaguar55', 'tgott1686', 'Nicenastybuttercup', 'turquoiseturtle01', 'DangerousFee4', 'turquoiseturtle01', 'BlueAzzure', 'carter_pride', 'NameIntrepid', 'tgott1686', 'No-Watercress-9116', 'Master-Champion-1528', 'PeteyZee1998', 'Nicenastybuttercup', 'PotentialAgile951', 'No-Watercress-9116', 'BlueAzzure', 'BlueAzzure', 'Terra246', 'Sommet_', 'SpektrumKid', 'Sea-Bluejay-7404', 'Lizziemaughan17x', 'Sommet_', 'BBlank223', 'joost666', 'BlueAzzure', 'purple07631', 'PeteyZee1998', 'mickNcheez', 'joost666', 'MycologistAdvanced24', 'poke000', 'OllieCad', 'BlueAzzure', 'SpektrumKid', 'rioboy1985', 'Sommet_', 'PeteyZee1998', 'SpektrumKid', 'littledaisy_07', 'Altruistic_System_41', 'SpektrumKid', 'OllieCad', 'Master-Champion-1528', 'purple07631', 'urbanracer34', 'Right_now78', 'sharksandpickles', 'shadowXXe', 'Living_Pin_2781', 'Infinite_Tax_6567', 'SpektrumKid', 'DangerousFee4', 'Altruistic_System_41', 'journey1992', 'NameIntrepid', 'Terra246', 'BBlank223', 'NameIntrepid', 'mavavilj', 'DangerousFee4', 'urbanracer34', 'Alternative-Jaguar55', 'No-Watercress-9116', 'MycologistAdvanced24', 'joost666', 'mickNcheez', 'urbanracer34', 'turquoiseturtle01', 'urbanracer34', 'BlueAzzure', 'Saiyanobe_23', 'foooood4thought', 'Infinite_Tax_6567', 'SpektrumKid', 'NameIntrepid', 'journey1992', 'NameIntrepid', 'BBlank223', 'mavavilj', 'Terra246', 'Alternative-Jaguar55', 'Infinite_Tax_6567', 'Infinite_Tax_6567', 'Living_Pin_2781', 'turquoiseturtle01', 'sharksandpickles', 'pleaseimconfused', 'Competitive_Bid7071', 'AspiringBiotech', 'OllieCad', 'shadowXXe', 'Alternative-Jaguar55', 'carter_pride', 'OllieCad', 'OllieCad', 'urbanracer34', 'Infinite_Tax_6567', 'PotentialAgile951', 'PeteyZee1998', 'DangerousFee4', 'BBlank223', 'turquoiseturtle01', 'RockyK96', 'BlueAzzure', 'BlueAzzure', 'Nicenastybuttercup', 'NameIntrepid', 'Infinite_Tax_6567', 'PeteyZee1998', 'Competitive_Bid7071', 'PotentialAgile951', 'littledaisy_07', 'BBlank223', 'Living_Pin_2781', 'Saiyanobe_23', 'NameIntrepid', 'journey1992', 'Living_Pin_2781', 'massivesmoke', 'urbanracer34', 'SpektrumKid', 'No-Watercress-9116', 'foooood4thought', 'Competitive_Bid7071', 'FaithInStrangers94', 'purple07631', 'Lizziemaughan17x', 'BBlank223', 'SlipInternational593', 'AspiringBiotech', 'Altruistic_System_41', 'purple07631', 'tgott1686', 'PotentialAgile951', 'urbanracer34', 'Elusive-Yoda', 'OllieCad', 'No-Watercress-9116', 'PotentialAgile951', 'sharksandpickles', 'BBlank223', 'Elusive-Yoda', 'purple07631', 'SpektrumKid', 'rioboy1985', 'sharksandpickles', 'FaithInStrangers94', 'journey1992', 'turquoiseturtle01', 'purple07631', 'NameIntrepid', 'joost666', 'Elusive-Yoda', 'shadowXXe', 'purple07631', 'Elusive-Yoda', 'sharksandpickles', 'BlueAzzure', 'urbanracer34', 'FaithInStrangers94', 'NameIntrepid', 'littledaisy_07', 'PotentialAgile951', 'Infinite_Tax_6567', 'turquoiseturtle01', 'PeteyZee1998', 'foooood4thought', 'tgott1686', 'Master-Champion-1528', 'shadowXXe', 'littledaisy_07', 'PeteyZee1998', 'mickNcheez', 'PotentialAgile951', 'PeteyZee1998', 'Saiyanobe_23', 'BBlank223', 'SpektrumKid', 'Competitive_Bid7071', 'carter_pride', 'joost666', 'MenuTime5231', 'pleaseimconfused', 'tgott1686', 'Altruistic_System_41', 'turquoiseturtle01', 'tgott1686', 'poke000', 'NameIntrepid', 'BlueAzzure', 'Sommet_', 'BBlank223', 'urbanracer34', 'rioboy1985', 'SpektrumKid', 'SpektrumKid', 'AspiringBiotech', 'FaithInStrangers94', 'AspiringBiotech', 'journey1992', 'turquoiseturtle01', 'Lizziemaughan17x', 'Elusive-Yoda', 'Right_now78', 'massivesmoke', 'NameIntrepid', 'BBlank223', 'Infinite_Tax_6567', 'SlipInternational593', 'NameIntrepid', 'carter_pride', 'SpektrumKid', 'journey1992', 'Lizziemaughan17x', 'carter_pride', 'urbanracer34', 'Competitive_Bid7071', 'AspiringBiotech', 'Elusive-Yoda', 'Sommet_', 'RockyK96', 'PeteyZee1998', 'Saiyanobe_23', 'littledaisy_07', 'NameIntrepid', 'littledaisy_07', 'SpektrumKid', 'BBlank223', 'urbanracer34', 'Infinite_Tax_6567', 'New_Shoe9530', 'journey1992', 'poke000', 'poke000', 'journey1992', 'poke000', 'Sommet_', 'New_Shoe9530', 'MenuTime5231', 'AspiringBiotech', 'urbanracer34', 'sharksandpickles', 'Saiyanobe_23', 'tgott1686', 'Lizziemaughan17x', 'journey1992', 'littledaisy_07', 'littledaisy_07', 'purple07631', 'OllieCad', 'Alternative-Jaguar55', 'Right_now78', 'mavavilj', 'PotentialAgile951', 'Master-Champion-1528', 'urbanracer34', 'turquoiseturtle01', 'PotentialAgile951', 'sharksandpickles', 'foooood4thought', 'NameIntrepid', 'Terra246', 'shadowXXe', 'No-Watercress-9116', 'Infinite_Tax_6567', 'mickNcheez', 'urbanracer34', 'BBlank223', 'littledaisy_07', 'SpektrumKid', 'MycologistAdvanced24', 'FaithInStrangers94', 'Lizziemaughan17x', 'littledaisy_07', 'littledaisy_07', 'Infinite_Tax_6567', 'SpektrumKid', 'littledaisy_07', 'Competitive_Bid7071', 'AspiringBiotech', 'joost666', 'BlueAzzure', 'turquoiseturtle01', 'mickNcheez', 'journey1992', 'journey1992', 'Infinite_Tax_6567', 'BBlank223', 'RockyK96', 'rioboy1985', 'shadowXXe', 'poke000', 'Alternative-Jaguar55', 'SpektrumKid', 'purple07631', 'poke000', 'poke000', 'littledaisy_07', 'RockyK96', 'Sommet_', 'PeteyZee1998', 'Infinite_Tax_6567', 'Right_now78', 'Nicenastybuttercup', 'BBlank223', 'Living_Pin_2781', 'Living_Pin_2781', 'littledaisy_07', 'FaithInStrangers94', 'Saiyanobe_23', 'joost666', 'NameIntrepid', 'RockyK96', 'AspiringBiotech', 'SlipInternational593', 'Infinite_Tax_6567', 'turquoiseturtle01', 'littledaisy_07', 'RockyK96', 'foooood4thought', 'NameIntrepid', 'MycologistAdvanced24', 'Infinite_Tax_6567', 'Saiyanobe_23', 'foooood4thought', 'SpektrumKid', 'NameIntrepid', 'mickNcheez', 'Ogenz', 'Terra246', 'pleaseimconfused', 'Infinite_Tax_6567', 'Saiyanobe_23', 'MycologistAdvanced24', 'FaithInStrangers94', 'joost666', 'AspiringBiotech', 'Infinite_Tax_6567', 'Elusive-Yoda', 'SpektrumKid', 'Altruistic_System_41', 'BBlank223', 'pleaseimconfused', 'Terra246', 'foooood4thought', 'Infinite_Tax_6567', 'Lizziemaughan17x', 'NameIntrepid', 'littledaisy_07', 'NameIntrepid', 'shadowXXe', 'carter_pride', 'No-Watercress-9116', 'Alternative-Jaguar55', 'Ogenz', 'Right_now78', 'Sommet_', 'Sommet_', 'urbanracer34', 'purple07631', 'sharksandpickles', 'Right_now78', 'joost666', 'BBlank223', 'shadowXXe', 'FaithInStrangers94', 'NameIntrepid', 'BBlank223', 'PotentialAgile951', 'mavavilj', 'pleaseimconfused', 'Living_Pin_2781', 'Right_now78', 'massivesmoke', 'Master-Champion-1528', 'BBlank223', 'Competitive_Bid7071', 'SlipInternational593', 'pleaseimconfused', 'BBlank223', 'littledaisy_07', 'PotentialAgile951', 'AspiringBiotech', 'BlueAzzure', 'DangerousFee4', 'Infinite_Tax_6567', 'journey1992', 'rioboy1985', 'Saiyanobe_23', 'joost666', 'MenuTime5231', 'pleaseimconfused', 'New_Shoe9530', 'urbanracer34', 'turquoiseturtle01', 'MenuTime5231', 'AspiringBiotech', 'turquoiseturtle01', 'Terra246', 'Competitive_Bid7071', 'Ogenz', 'foooood4thought', 'Infinite_Tax_6567', 'pleaseimconfused', 'urbanracer34', 'Living_Pin_2781', 'joost666', 'No-Watercress-9116', 'No-Watercress-9116', 'SlipInternational593', 'shadowXXe', 'AspiringBiotech', 'journey1992', 'PeteyZee1998', 'littledaisy_07', 'Nicenastybuttercup', 'turquoiseturtle01', 'journey1992', 'joost666', 'Infinite_Tax_6567', 'BBlank223', 'pleaseimconfused', 'FaithInStrangers94', 'shadowXXe', 'tgott1686', 'NameIntrepid', 'PeteyZee1998', 'carter_pride', 'BlueAzzure', 'joost666', 'PotentialAgile951', 'littledaisy_07', 'purple07631', 'turquoiseturtle01', 'Competitive_Bid7071', 'Saiyanobe_23', 'BBlank223', 'littledaisy_07', 'Terra246', 'poke000', 'purple07631', 'PotentialAgile951', 'Infinite_Tax_6567', 'Altruistic_System_41', 'FaithInStrangers94', 'mavavilj', 'sharksandpickles', 'sharksandpickles', 'BBlank223', 'rioboy1985', 'AspiringBiotech', 'turquoiseturtle01', 'pleaseimconfused', 'mavavilj', 'pleaseimconfused', 'littledaisy_07', 'Terra246', 'mickNcheez', 'purple07631', 'No-Watercress-9116', 'Infinite_Tax_6567', 'NameIntrepid', 'NameIntrepid', 'NameIntrepid', 'foooood4thought', 'SpektrumKid', 'PotentialAgile951', 'Master-Champion-1528', 'Competitive_Bid7071', 'FaithInStrangers94', 'Alternative-Jaguar55', 'Lizziemaughan17x', 'BBlank223', 'mickNcheez', 'mickNcheez', 'purple07631', 'AspiringBiotech', 'BBlank223', 'AspiringBiotech', 'FaithInStrangers94', 'turquoiseturtle01', 'carter_pride', 'Elusive-Yoda', 'tgott1686', 'Nicenastybuttercup', 'littledaisy_07', 'Saiyanobe_23', 'foooood4thought', 'Saiyanobe_23', 'OllieCad', 'urbanracer34', 'Competitive_Bid7071', 'OllieCad', 'Competitive_Bid7071', 'OllieCad', 'Lizziemaughan17x', 'PotentialAgile951', 'Ogenz', 'foooood4thought', 'MycologistAdvanced24', 'rioboy1985', 'rioboy1985', 'littledaisy_07', 'No-Watercress-9116', 'Lizziemaughan17x', 'urbanracer34', 'tgott1686', 'Elusive-Yoda', 'FaithInStrangers94', 'Nicenastybuttercup', 'Saiyanobe_23', 'PeteyZee1998', 'joost666', 'joost666', 'BlueAzzure', 'No-Watercress-9116', 'urbanracer34', 'Elusive-Yoda', 'Nicenastybuttercup', 'mickNcheez', 'Master-Champion-1528', 'mavavilj', 'Elusive-Yoda', 'purple07631', 'littledaisy_07', 'Alternative-Jaguar55', 'poke000', 'journey1992', 'urbanracer34', 'joost666', 'Ogenz', 'SlipInternational593', 'BBlank223', 'massivesmoke', 'Sommet_', 'Sommet_', 'NameIntrepid', 'Living_Pin_2781', 'journey1992', 'Competitive_Bid7071', 'shadowXXe', 'Ogenz', 'AspiringBiotech', 'sharksandpickles', 'mickNcheez', 'sharksandpickles', 'BBlank223', 'Competitive_Bid7071', 'Master-Champion-1528', 'PeteyZee1998', 'mavavilj', 'DangerousFee4', 'Lizziemaughan17x', 'massivesmoke', 'rioboy1985', 'BlueAzzure', 'urbanracer34', 'urbanracer34', 'littledaisy_07', 'AspiringBiotech', 'NameIntrepid', 'Infinite_Tax_6567', 'PotentialAgile951', 'joost666', 'poke000', 'SlipInternational593', 'PotentialAgile951', 'NameIntrepid', 'RockyK96', 'BBlank223', 'No-Watercress-9116', 'sharksandpickles', 'FaithInStrangers94', 'Saiyanobe_23', 'Right_now78', 'joost666', 'Living_Pin_2781', 'No-Watercress-9116', 'SpektrumKid', 'Infinite_Tax_6567', 'joost666', 'PeteyZee1998', 'No-Watercress-9116', 'BBlank223', 'Competitive_Bid7071', 'BBlank223', 'Competitive_Bid7071', 'Saiyanobe_23', 'joost666', 'PotentialAgile951', 'OllieCad', 'PeteyZee1998', 'foooood4thought', 'BBlank223', 'NameIntrepid', 'joost666', 'NameIntrepid', 'rioboy1985', 'foooood4thought', 'BlueAzzure', 'Living_Pin_2781', 'littledaisy_07', 'purple07631', 'rioboy1985', 'purple07631', 'OllieCad', 'joost666', 'urbanracer34', 'rioboy1985', 'foooood4thought', 'SpektrumKid', 'urbanracer34', 'massivesmoke', 'No-Watercress-9116', 'urbanracer34', 'Infinite_Tax_6567', 'MycologistAdvanced24', 'turquoiseturtle01', 'PotentialAgile951', 'Competitive_Bid7071', 'Infinite_Tax_6567', 'sharksandpickles', 'mavavilj', 'joost666', 'No-Watercress-9116', 'poke000', 'journey1992', 'Lizziemaughan17x', 'Ogenz', 'urbanracer34', 'urbanracer34', 'turquoiseturtle01', 'PotentialAgile951', 'BBlank223', 'Lizziemaughan17x', 'NameIntrepid', 'Infinite_Tax_6567', 'MenuTime5231', 'mavavilj', 'Sommet_', 'mickNcheez', 'Infinite_Tax_6567', 'foooood4thought', 'New_Shoe9530', 'NameIntrepid', 'massivesmoke', 'urbanracer34', 'massivesmoke', 'AspiringBiotech', 'poke000', 'Elusive-Yoda', 'BBlank223', 'sharksandpickles', 'Master-Champion-1528', 'Elusive-Yoda', 'BBlank223', 'Competitive_Bid7071', 'massivesmoke', 'tgott1686', 'Elusive-Yoda', 'Infinite_Tax_6567', 'rioboy1985', 'BBlank223', 'MenuTime5231', 'DangerousFee4', 'joost666', 'sharksandpickles', 'FaithInStrangers94', 'Sommet_', 'turquoiseturtle01', 'Infinite_Tax_6567', 'MenuTime5231', 'RockyK96', 'SpektrumKid', 'journey1992', 'Master-Champion-1528', 'BBlank223', 'turquoiseturtle01', 'Sommet_', 'tgott1686', 'carter_pride', 'Altruistic_System_41', 'NameIntrepid', 'Living_Pin_2781', 'SpektrumKid', 'MenuTime5231', 'rioboy1985', 'BBlank223', 'NameIntrepid', 'rioboy1985', 'joost666', 'shadowXXe', 'Competitive_Bid7071', 'Infinite_Tax_6567', 'mickNcheez', 'purple07631', 'journey1992', 'Lizziemaughan17x', 'purple07631', 'Lizziemaughan17x', 'Lizziemaughan17x', 'BBlank223', 'No-Watercress-9116', 'massivesmoke', 'foooood4thought', 'mickNcheez', 'littledaisy_07', 'BBlank223', 'Alternative-Jaguar55', 'Infinite_Tax_6567', 'No-Watercress-9116', 'No-Watercress-9116', 'New_Shoe9530', 'mavavilj', 'PeteyZee1998', 'poke000', 'Lizziemaughan17x', 'pleaseimconfused', 'shadowXXe', 'rioboy1985', 'SpektrumKid', 'Lizziemaughan17x', 'Sommet_', 'Saiyanobe_23', 'urbanracer34', 'SpektrumKid', 'littledaisy_07', 'Lizziemaughan17x', 'Saiyanobe_23', 'Competitive_Bid7071', 'Elusive-Yoda', 'SpektrumKid', 'purple07631', 'BBlank223', 'Right_now78', 'Elusive-Yoda', 'urbanracer34', 'BBlank223', 'turquoiseturtle01', 'MycologistAdvanced24', 'urbanracer34', 'NameIntrepid', 'joost666', 'SlipInternational593', 'Ogenz', 'foooood4thought', 'Saiyanobe_23', 'journey1992', 'joost666', 'Infinite_Tax_6567', 'BBlank223', 'mickNcheez', 'NameIntrepid', 'turquoiseturtle01', 'NameIntrepid', 'Terra246', 'Living_Pin_2781', 'littledaisy_07', 'mickNcheez', 'Living_Pin_2781', 'turquoiseturtle01', 'Saiyanobe_23', 'Right_now78', 'turquoiseturtle01', 'Altruistic_System_41', 'rioboy1985', 'Infinite_Tax_6567', 'Saiyanobe_23', 'Altruistic_System_41', 'joost666', 'joost666', 'journey1992', 'PotentialAgile951', 'turquoiseturtle01', 'PeteyZee1998', 'Competitive_Bid7071', 'poke000', 'BBlank223', 'No-Watercress-9116', 'pleaseimconfused', 'urbanracer34', 'tgott1686', 'SlipInternational593', 'pleaseimconfused', 'Terra246', 'SpektrumKid', 'mickNcheez', 'mickNcheez', 'Saiyanobe_23', 'sharksandpickles', 'AspiringBiotech', 'rioboy1985', 'Saiyanobe_23', 'Alternative-Jaguar55', 'BBlank223', 'Lizziemaughan17x', 'SpektrumKid', 'OllieCad', 'journey1992', 'Infinite_Tax_6567', 'carter_pride', 'pleaseimconfused', 'MycologistAdvanced24', 'OllieCad', 'urbanracer34', 'littledaisy_07', 'urbanracer34', 'SpektrumKid', 'Alternative-Jaguar55', 'BBlank223', 'urbanracer34', 'Terra246', 'RockyK96', 'DangerousFee4', 'BlueAzzure', 'AspiringBiotech', 'tgott1686', 'mavavilj', 'Terra246', 'Infinite_Tax_6567', 'poke000', 'carter_pride', 'No-Watercress-9116', 'MenuTime5231', 'Altruistic_System_41', 'RockyK96', 'poke000', 'OllieCad', 'poke000', 'rioboy1985', 'joost666', 'SpektrumKid', 'journey1992', 'purple07631', 'No-Watercress-9116', 'Right_now78', 'MenuTime5231', 'Ogenz', 'Living_Pin_2781', 'DangerousFee4', 'mavavilj', 'massivesmoke', 'Ogenz', 'massivesmoke', 'OllieCad', 'BBlank223', 'OllieCad', 'Right_now78', 'Infinite_Tax_6567', 'joost666', 'mavavilj', 'New_Shoe9530', 'NameIntrepid', 'OllieCad', 'Lizziemaughan17x', 'Living_Pin_2781', 'Right_now78', 'Competitive_Bid7071', 'tgott1686', 'Competitive_Bid7071', 'carter_pride', 'BlueAzzure', 'Alternative-Jaguar55', 'MenuTime5231', 'pleaseimconfused', 'BlueAzzure', 'Infinite_Tax_6567', 'New_Shoe9530', 'carter_pride', 'Right_now78', 'Competitive_Bid7071', 'journey1992', 'Terra246', 'purple07631', 'Sommet_', 'mickNcheez', 'foooood4thought', 'Infinite_Tax_6567', 'AspiringBiotech', 'MycologistAdvanced24', 'MycologistAdvanced24', 'purple07631', 'OllieCad', 'Ogenz', 'SpektrumKid', 'littledaisy_07', 'Nicenastybuttercup', 'poke000', 'littledaisy_07', 'MenuTime5231', 'Nicenastybuttercup', 'Lizziemaughan17x', 'urbanracer34', 'mickNcheez', 'SpektrumKid', 'Lizziemaughan17x', 'Master-Champion-1528', 'AspiringBiotech', 'MenuTime5231', 'littledaisy_07', 'poke000', 'OllieCad', 'DangerousFee4', 'SlipInternational593', 'PeteyZee1998', 'turquoiseturtle01', 'Elusive-Yoda', 'Ogenz', 'joost666', 'Saiyanobe_23', 'pleaseimconfused', 'urbanracer34', 'BlueAzzure', 'Infinite_Tax_6567', 'joost666', 'SpektrumKid', 'PotentialAgile951', 'SlipInternational593', 'No-Watercress-9116', 'FaithInStrangers94', 'pleaseimconfused', 'littledaisy_07', 'Terra246', 'urbanracer34', 'Alternative-Jaguar55', 'AspiringBiotech', 'shadowXXe', 'BBlank223', 'RockyK96', 'SlipInternational593', 'SlipInternational593', 'mickNcheez', 'littledaisy_07']
        }
    }

    def __init__(
        self,
        dataset_name: str = "yelp",
        batch_size: int = 16,
        **kwargs
    ):
        """
        :param model_checkpoint: Hugging Face model to use as the attacker.
        """
        super().__init__(**kwargs)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.batch_size = batch_size

        if dataset_name not in self.DATASET_CONFIGS:
            raise ValueError(f"Unknown dataset config mapping: {dataset_name}")
        
        config = self.DATASET_CONFIGS[dataset_name]
        self.label_path = config["label_path"]
        
        loaded_labels = self._load_labels()
        self.labels = loaded_labels if loaded_labels else config["fallback_labels"]

        self.clf = pipeline(
            "text-classification",
            model=config["model"],
            device=self.device,
            token=os.getenv("HF_TOKEN"),
            model_kwargs={"dtype": torch.float16 if self.device == "cuda" else torch.float32},
            batch_size=self.batch_size,
            truncation=True,
            max_length=512
        )

    def _load_labels(self):
        if os.path.exists(self.label_path):
            try:
                with open(self.label_path, 'r') as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            except Exception as e:
                print(f"Error loading labels: {e}")
        return []

    def _predict_labels(self, texts):
        if not texts:
            return []
        preds = self.clf(texts)
        if isinstance(preds, dict):
            preds = [preds]
        return [int(p["label"][-1]) for p in preds]

    def score(self, original, private, progress_callback=None):
        try:
            if len(original) != len(private):
                raise ValueError("`original` and `private` must have the same length.")
            if not original:
                raise ValueError("Inputs must be non-empty.")
            
            valid_pairs = []
            for og, priv in zip(original, private):
                if pd.notna(priv):
                    valid_pairs.append((str(og), str(priv)))
                else:
                    valid_pairs.append((str(og), " "))

            original_cleaned, private_cleaned = zip(*valid_pairs)
            original_cleaned = list(original_cleaned)
            private_cleaned = list(private_cleaned)

            num_samples = len(original_cleaned)

            orig_labels = self._predict_labels(original_cleaned)
            if progress_callback:
                progress_callback(num_samples // 2)

            priv_labels = self._predict_labels(private_cleaned)
            if progress_callback:
                progress_callback(num_samples)

            if len(orig_labels) != len(priv_labels):
                raise RuntimeError("Attacker returned mismatched number of predictions.")

            og_f1 = f1_score(orig_labels, self.labels[:num_samples], average="micro")
            priv_f1 = f1_score(priv_labels, self.labels[:num_samples], average="micro")

            if og_f1 <= 0.0:
                return 100.0

            privacy_score = max(0, min(100.0, (1.0 - (priv_f1/og_f1)) * 100.0))
            return round(privacy_score, 3)
        finally:
            del self.clf
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
