Research interests
==================
:id: research
:layout: stack

.. lede:: Two questions I keep returning to: how a model builds a world, and how it learns to move through one.

Both sit on the generative side of vision, and they answer to each other. One asks what a model must hold in memory to stay consistent while a person acts on it. The other asks how noise becomes structure, and what the cleanest description of that transformation is. The second is the machinery; the first is what I want to build with it.

The order matters for how I study. I do not start from an architecture and look for a task. I start from a quantity — a density, a score, a velocity field — ask what makes estimating it hard, and only then look at what the architecture is doing about it. Reimplementing is how I check that the answer I arrived at is the real one.

----

Interactive world models
========================
:id: world-models
:layout: stack

.. lede:: A learned simulator you can act inside.

A world model predicts what happens next. An interactive one has to keep that prediction coherent while a person intervenes — turning the camera, picking something up, changing their mind halfway through. The difficulty is not producing one convincing frame. It is that the thousandth frame still has to agree with the first about what exists, and that the agreement has to survive an action nobody trained on.

Classically this was framed as model-based reinforcement learning: learn the environment, plan inside it, act. The recent line of work reframes it as generation — the simulator is a conditional video model, and the action is just another conditioning signal. That reframing brought the visual fidelity of diffusion models to environments, and inherited their weakness: a generative model is trained to be plausible frame by frame, not consistent over minutes.

.. stats::
   :item: State | what the model holds, unseen, between frames
   :item: Action | the intervention it must stay consistent with
   :item: Horizon | how long that consistency survives

.. embed:: https://www.youtube.com/watch?v=PDKhUknuQDg
   :caption: Genie 3, Google DeepMind (2025). A world generated from a text prompt and navigated in real time — the clearest public demonstration of what an interactive world model has to hold onto while a person moves through it.

What makes it hard
==================
:id: wm-hard
:layout: grid

.. card:: Drift
   :num: 01
   Each prediction is conditioned on the previous one, so a small error is inherited and amplified. Rollouts rarely fail loudly; they slowly stop describing the same place. Teacher forcing during training hides this, because the model never has to consume its own mistakes.

.. card:: Memory
   :num: 02
   An object that leaves the frame has to exist when the camera comes back. That needs a persistent state, not a longer context window — a next-frame predictor with no notion of what is off-screen will happily invent a different room.

.. card:: Controllability
   :num: 03
   An action must change the world the way the user meant and change nothing else. Entanglement between action and appearance is what makes a simulator feel unresponsive: the frame moves, but not because you moved.

Lines of work I follow
======================
:id: wm-refs
:layout: stack

.. refs::
   :item: Recurrent latent world models with imagination-based training (the Dreamer line) | 2018—2023
   :item: Action-conditioned video generation as a playable simulator (GameNGen, Genie) | 2024—2025
   :item: Long-horizon consistency and memory in video diffusion | ongoing

----

Diffusion & flow models
=======================
:id: diffusion
:layout: stack

.. lede:: One equation for how probability moves.

Diffusion runs clean data into noise along a known path, then learns to walk that path backwards. Flow matching describes the same journey as a velocity field and learns to follow it. The two look like separate families and are not: both are statements about how a density evolves in time, and the continuity equation — the Fokker-Planck equation for the stochastic case — is where they meet.

Getting to that view took the field about five years, and retracing it is most of what I have studied. The variational account came first, then the score-based one, then the observation that both are discretisations of the same SDE, and finally the flow picture, which drops the noise and keeps the transport.

.. diagram:: Same endpoints, different trajectories. Sampling cost follows how curved the path is — which is why straightening it, rather than adding steps, is where the recent work went.
   :cite: Diagram drawn after Liu, Gong & Liu, "Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow" (2022) <https://arxiv.org/abs/2209.03003>

.. field:: Left: the score of a two-mode density (shaded), evaluated on a grid — it points uphill and dies at each mode. Right: the straightened transport between the noise and data marginals, which is the same everywhere.

Three views, one object
=======================
:id: three-views
:layout: grid

.. card:: Variational
   :num: 01
   A hierarchy of latent variables and a bound to optimise. DDPM read as a very deep VAE whose encoder is fixed rather than learned, which is why its loss collapses into a simple denoising objective.

.. card:: Score-based
   :num: 02
   Learn the gradient of the log density and follow it. Annealed Langevin dynamics across many noise scales, because a single scale leaves the low-density regions — exactly where samples start — unestimated.

.. card:: Flow-based
   :num: 03
   Learn a velocity field that transports one distribution onto another. Straighter paths mean fewer solver steps, and sampling becomes an ODE you can integrate as coarsely as you dare.

Why the unification matters
===========================
:id: why
:layout: stack

.. card:: The same model, four ways to ask it a question
   :meta: Parameterisation
   :bullet: Predicting noise, clean data, score, or velocity are one-to-one reparameterisations of each other.
   :bullet: The choice changes the loss weighting and the conditioning trick, not the underlying object.
   :bullet: Noise schedules convert into one another the same way, which is why so many papers turn out to be the same paper in different coordinates.
   :bullet: Sampler cost follows path curvature, so the practical question is which parameterisation makes the trajectory straight.
   Reading the field this way makes it navigable: fewer methods to memorise, one continuity equation to understand, and a clear place to look when something fails.

.. refs::
   :item: Denoising diffusion probabilistic models | 2020
   :item: Score-based generative modeling through stochastic differential equations | 2021
   :item: Flow matching and rectified flow for generative modeling | 2022—2023
   :item: Lai et al., The Principles of Diffusion Models | 2025 | https://arxiv.org/abs/2510.21890

Where the two meet
==================
:id: overlap
:layout: stack

A world model needs a generator that is fast, controllable, and stable over long horizons. Flow-based samplers are the most promising answer to the first two: few steps, and a velocity field that action conditioning can enter cleanly. The theory of how density evolves is the only honest way I know to reason about the third, because drift is a statement about distributions, not about pixels.

That overlap is where I want to work — using what the diffusion literature settled about density transport to say something precise about why simulators lose the plot, and what to change so they do not.

.. pills:: Interactive world models, Diffusion, Flow matching, Score matching, Long-horizon rollouts, Controllable generation, Model-based RL

I write up each derivation as I work through it. Those notes live under Writings.
