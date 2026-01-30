---
date: '2026-01-30T05:00:00'
draft: false
source_name: arXiv cs.RO
source_url: https://arxiv.org/abs/2601.21297
title: 'Deep QP Safety Filter: Model-free Learning for Reachability-based Safety Filter'
tags:
  - cs.RO
  - cs.SY
  - eess.SY
  - industry
  - robotics
---

arXiv:2601.21297v1 Announce Type: new 
Abstract: We introduce Deep QP Safety Filter, a fully data-driven safety layer for black-box dynamical systems. Our method learns a Quadratic-Program (QP) safety filter without model knowledge by combining Hamilton-Jacobi (HJ) reachability with model-free learning. We construct contraction-based losses for both the safety value and its derivatives, and train two neural networks accordingly. In the exact setting, the learned critic converges to the viscosity solution (and its derivative), even for non-smooth values. Across diverse dynamical systems -- even including a hybrid system -- and multiple RL tasks, Deep QP Safety Filter substantially reduces pre-convergence failures while accelerating learning toward higher returns than strong baselines, offering a principled and practical route to safe, model-free control.

[Read the original article](https://arxiv.org/abs/2601.21297)