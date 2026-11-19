"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import PIX, box_blur, contrast_features, run
from make_data import generate


def test_generator_is_deterministic_and_positives_are_rare():
    a, b = generate(n=600), generate(n=600)
    assert a.equals(b)
    assert 0.05 < a.label.mean() < 0.2


def test_the_shortcut_exists_at_site_a_but_not_as_strongly_at_site_b():
    d = generate()
    mean = d[PIX].mean(axis=1)
    gap = lambda site: mean[(d.site == site) & (d.label == 1)].mean() - mean[(d.site == site) & (d.label == 0)].mean()   # noqa: E731
    assert gap(0) > gap(1) + 0.03


def test_pooled_contrast_ignores_a_global_brightness_shift():
    imgs = generate(n=200)[PIX].to_numpy()
    assert np.allclose(contrast_features(imgs), contrast_features(imgs + 0.3), atol=1e-6)


def test_box_blur_preserves_a_flat_image():
    flat = np.full((1, 400), 0.5)
    assert np.allclose(box_blur(flat), 0.5)


@pytest.fixture(scope="module")
def report():
    return run(seed=71)


def test_the_pixel_model_looks_perfect_at_site_a_and_flags_almost_everything_at_site_b(report):
    m = report["pixels_lr"]
    assert m["site_A_heldout"]["auc"] >= 0.99, report
    assert m["site_B_at_A_threshold"]["false_positive_rate"] >= 0.5, report


def test_local_contrast_features_keep_false_alarms_stable_across_sites(report):
    m = report["contrast_aug_lr"]
    assert m["site_A_heldout"]["auc"] >= 0.95, report
    assert m["site_B_at_A_threshold"]["false_positive_rate"] <= 0.15, report
