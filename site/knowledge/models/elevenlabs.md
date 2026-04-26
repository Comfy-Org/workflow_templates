---
title: "ElevenLabs"
description: "ElevenLabs is a leading AI voice and audio generation platform — text-to-speech, speech-to-speech, transcription, sound effects, dialogue generation, and voice isolation."
sidebarTitle: "ElevenLabs"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**ElevenLabs** has established itself as one of the most powerful and versatile audio AI platforms available today, covering everything from expressive text-to-speech to full speech-to-text transcription and sound effects generation. At the core of its TTS offering are three distinct model tiers: **Eleven v3**, the flagship for emotional expressiveness and natural prosody — it captures subtle inflections, pauses, and emphasis better than any previous version; **Multilingual v2**, which delivers consistent, natural-sounding speech across dozens of languages with stable long-form handling, ideal for podcasts, audiobooks, and multilingual content; and **Flash v2.5**, optimized for real-time applications with an astonishing 75ms latency, making it suitable for live streaming, conversational agents, and interactive voice experiences. Beyond TTS, ElevenLabs offers **Speech-to-Speech** (STS), which takes an audio input and transforms it into another voice while preserving the original intonation, pacing, and emotional delivery — a game-changer for dubbing, voice acting, and content repurposing. On the transcription side, **Scribe v2** is their speech-to-text model supporting over 90 languages, capable of identifying up to 32 distinct speakers in a single recording and detecting 56 classes of entities, making it one of the most comprehensive ASR models available. The platform also includes **Text-to-Sound-Effects** for generating custom audio from natural language descriptions, **Text-to-Dialogue** for multi-character conversational audio generation, and **Voice Isolation** for removing background noise from any recording. A standout feature is ElevenLabs' voice cloning capability — with just a few minutes of reference audio, you can create a convincing synthetic voice, or you can choose from a library of over 100,000 pre-made voices spanning accents, ages, and styles. Whether you are producing audiobooks, dubbing videos, building voice assistants, generating game audio, or cleaning up field recordings, ElevenLabs provides a complete end-to-end audio pipeline.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Text to Speech — convert text into natural-sounding speech using Eleven v3, Multilingual v2, or Flash v2.5

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_elevenlabs_text_to_speech&utm_source=docs">
    Generate speech from text using ElevenLabs' most advanced TTS models. Choose from Eleven v3 for maximum emotional range, Multilingual v2 for cross-language consistency, or Flash v2.5 for sub-100ms real-time generation.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_elevenlabs_text_to_speech.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Speech to Speech — convert any audio to a target voice while preserving the original delivery

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_elevenlabs_speech_to_speech&utm_source=docs">
    Take any audio recording and replace the voice with a different character or style, keeping the original intonation, rhythm, and emotion intact. Perfect for dubbing, voice acting, and repurposing spoken content.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_elevenlabs_speech_to_speech.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Speech to Text — transcribe audio with Scribe v2, supporting 90+ languages, 32-speaker diarization, and 56-class entity detection

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_elevenLabs_speech_to_text&utm_source=docs">
    Transcribe and analyze audio with state-of-the-art accuracy. Scribe v2 handles long-form recordings with speaker separation, identifies who said what, and can extract entities like names, dates, places, and organizations from the transcribed content.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_elevenLabs_speech_to_text.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Text to Sound Effects — generate custom sound effects from natural language descriptions

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_elevenlabs_text_to_sound_effects&utm_source=docs">
    Describe any sound — footsteps on gravel, a thunderstorm, a futuristic spaceship hum, or a coffee shop ambience — and ElevenLabs will generate a matching audio clip. Ideal for game development, video production, and podcast sound design.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_elevenlabs_text_to_sound_effects.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Text to Dialogue — generate multi-character conversational audio with distinct voices for each participant

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_elevenlabs_text_to_dialogue&utm_source=docs">
    Write a script with multiple speakers and generate a fully voiced dialogue where each character has their own distinct voice, complete with natural back-and-forth rhythm and emotional delivery. Perfect for audiobooks, podcasts, radio plays, and interactive storytelling.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_elevenlabs_text_to_dialogue.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Voice Isolation — remove background noise and isolate the primary voice from any recording

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_elevenlabs_voice_isolation&utm_source=docs">
    Clean up noisy recordings by separating voice from background sounds. Whether it's a podcast recorded in a less-than-ideal environment, a field interview with wind noise, or a phone call with room echo, Voice Isolation strips it down to crystal-clear speech.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_elevenlabs_voice_isolation.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Expressive audiobook and podcast production.** Eleven v3 shines in long-form narration where emotional nuance matters. A narrator can sound genuinely excited during an action scene, soft and contemplative during reflective passages, and tense during climactic moments — all without manually editing pitch curves. Combined with the 100,000+ voice library or a custom voice clone created from just a few minutes of reference audio, producers can cast the perfect voice for every project. Multilingual v2 extends this capability across languages, so the same audiobook can be produced in English, Spanish, French, German, and Chinese with consistent quality in each version, all using the same workflow.

**Real-time conversational agents and live dubbing.** Flash v2.5's 75ms latency makes it viable for applications where delay destroys the user experience — live-streaming voiceovers, real-time language dubbing for broadcasts, and interactive voice assistants that need to respond as naturally as a human. Content creators can stream in one language and have their voice instantly dubbed into another with Speech-to-Speech, which preserves the original energy, timing, and emotional delivery. This is especially powerful for live gaming streams, international conferences, and multilingual customer support where a warm, human-like voice at real-time speed makes all the difference.

**Post-production audio cleanup and transcription.** Scribe v2 turns raw audio into structured, searchable text with speaker labels and entity extraction, dramatically reducing the time spent manually transcribing interviews, meetings, and lectures. When combined with Voice Isolation, even recordings made in noisy environments — a coffee shop interview, a conference keynote with audience murmur, a phone call on a busy street — can be cleaned up before transcription, producing accurate results that capture not just the words but who said them. For journalists, researchers, and content creators working with field recordings, this combination eliminates hours of manual work.

**Game audio and sound design from text.** Text to Sound Effects opens a new creative pipeline for sound designers and indie developers who need custom audio but lack the budget for a full recording studio. Instead of searching through stock sound libraries or recording foley, you can describe exactly what you need — "a heavy iron door creaking open in an abandoned castle, with a faint echo" — and generate it on demand. Text to Dialogue extends this to character voices, letting you script entire conversations between NPCs without casting voice actors, with each character getting a unique voice and delivery style.

**Content repurposing across languages and formats.** A single podcast episode can be transcribed with Scribe v2, have its voice replaced through Speech-to-Speech for different audiences, have custom sound effects added through Text to Sound Effects for social media clips, and be voice-isolated for clean audio excerpts across YouTube, TikTok, Spotify, and broadcast. Content creators maintaining multiple channels can produce a single recording once and transform it into ten different formats, each optimized for its platform, without re-recording anything.
