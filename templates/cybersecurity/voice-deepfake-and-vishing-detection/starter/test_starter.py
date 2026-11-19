"""Executable gates for the audio engine."""

import numpy as np

from baseline import FB, log_filterbank, raw_spectrum, run, wer
from make_data import N, clip

R = run()


def test_clips_are_deterministic():
    a = clip(1, np.random.default_rng(3), 10.0)
    b = clip(1, np.random.default_rng(3), 10.0)
    assert np.array_equal(a, b) and a.shape == (N,)


def test_word_error_rate_on_known_cases():
    assert wer("the cat sat", "the cat sat") == 0.0
    assert abs(wer("the cat sat", "the cat sat down") - 1 / 3) < 1e-12
    assert abs(wer("the cat sat", "a cat") - 2 / 3) < 1e-12


def test_normalisation_removes_recording_gain():
    x = clip(2, np.random.default_rng(1), 10.0)
    assert np.allclose(log_filterbank(x), log_filterbank(5.0 * x), atol=1e-6)
    assert not np.allclose(raw_spectrum(x), raw_spectrum(5.0 * x))


def test_filterbank_covers_the_spectrum():
    assert FB.shape[0] == 20 and (FB.sum(axis=0) > 0).sum() > 0.8 * FB.shape[1]


def test_the_model_learns_on_the_training_channel():
    assert R["log_filterbank_challenger"]["same_channel"]["accuracy"] > 0.9


def test_the_channel_shift_costs_accuracy():
    assert R["channel_shift_drop_challenger"] > 0.02


def test_training_on_channel_effects_recovers_the_shifted_channel():
    assert R["augmentation_gain_on_shifted_channel"] > 0.1
    assert R["log_filterbank_with_channel_augmentation"]["shifted_channel"]["accuracy"] > R["raw_spectrum_baseline"]["shifted_channel"]["accuracy"]


def test_simulated_wer_tracks_the_corruption():
    assert R["wer_simulated"]["noisy"] > 2 * R["wer_simulated"]["clean"]
