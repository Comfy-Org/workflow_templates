#!/usr/bin/env python3
"""
official_descriptions.py - Official/community-sourced node descriptions.

Node-level descriptions sourced from each partner's official documentation
(llms.txt / .md pages), Wikipedia summaries and community signals (Hacker News
discussions). This is the "official & objective" layer over the static
rule-based fallbacks in node_capabilities.py.

Data layout:
  partner_overview: {partner_slug: official one-line overview}
  node_descriptions: {node_id: official description text}
  model_notes: {model_name: official model description}

Sources are cited in comments only (NOT in the emitted JSON — the deliverable
stays URL-free per project convention).
"""

# partner slug = last segment of node category (partner/<domain>/<slug>)
PARTNER_OVERVIEW = {
    "ElevenLabs": (
        "ElevenLabs provides APIs and SDKs for text to speech, voice cloning, "
        "speech to text, sound effects, voice isolation, voice changing, and "
        "conversational AI agents."
    ),
}

# node_id -> official description (from official docs; concise & objective)
NODE_DESCRIPTIONS = {
    "ElevenLabsAudioIsolation": (
        "The ElevenLabs voice isolator API transforms audio recordings with "
        "background noise into clean, studio-quality speech, removing ambient "
        "sounds, music and other interference."
    ),
    "ElevenLabsInstantVoiceClone": (
        "Instant voice cloning creates a realistic copy of a voice from a short "
        "audio sample, enabling speech generation in that voice."
    ),
    "ElevenLabsSpeechToSpeech": (
        "The ElevenLabs voice changer API transforms any source audio into a "
        "different, fully cloned voice while preserving the performance nuances "
        "of the original, including whispers, laughs, cries and accents."
    ),
    "ElevenLabsSpeechToText": (
        "The ElevenLabs Speech to Text API turns spoken audio into text with "
        "state-of-the-art accuracy; the Scribe v2 model supports 90+ languages, "
        "keyterm prompting, entity detection, speaker diarization and word-level "
        "timestamps."
    ),
    "ElevenLabsTextToDialogue": (
        "The ElevenLabs Text to Dialogue API creates natural-sounding, expressive "
        "dialogue from text using the Eleven v3 model, for video games, podcasts "
        "and audiobooks."
    ),
    "ElevenLabsTextToSoundEffects": (
        "The ElevenLabs sound effects API turns text descriptions into "
        "high-quality audio effects with precise control over timing, style and "
        "complexity, for sound design and custom sound effects."
    ),
    "ElevenLabsTextToSpeech": (
        "The ElevenLabs Text to Speech API turns text into lifelike audio with "
        "nuanced intonation, pacing and emotional awareness, for narration, "
        "audiobooks, dubbing and voice agents."
    ),
    "ElevenLabsVoiceSelector": (
        "Select a voice from the ElevenLabs voice library, community voices or "
        "custom cloned voices to use with text-to-speech generation."
    ),
}

# model name -> official description (from official model docs)
MODEL_NOTES = {
    "eleven_v3": (
        "Eleven v3: most emotionally rich, expressive speech synthesis model; "
        "dramatic delivery, 70+ languages, natural multi-speaker dialogue."
    ),
    "eleven_multilingual_v2": (
        "Eleven Multilingual v2: lifelike, consistent quality speech synthesis; "
        "29 languages, most stable on long-form generations."
    ),
    "eleven_flash_v2_5": (
        "Eleven Flash v2.5: fast, affordable speech synthesis with ultra-low "
        "latency (~75ms), 32 languages, 50% lower price per character."
    ),
    "eleven_multilingual_sts_v2": (
        "Eleven Multilingual v2 (Speech to Speech): state-of-the-art multilingual "
        "voice changer."
    ),
    "eleven_english_sts_v2": (
        "Eleven English v2 (Speech to Speech): English-only voice changer."
    ),
    "scribe_v2": (
        "Scribe v2: state-of-the-art speech recognition; 90+ languages, keyterm "
        "prompting, entity detection, speaker diarization, word-level timestamps."
    ),
    "eleven_text_to_sound_v2": (
        "Eleven Text to Sound v2: sound effects generation from text prompts."
    ),
}


def get_partner_overview(partner_slug: str) -> str:
    return PARTNER_OVERVIEW.get(partner_slug, "")


def get_node_description(node_id: str) -> str:
    return NODE_DESCRIPTIONS.get(node_id, "")


def get_model_note(model_name: str) -> str:
    return MODEL_NOTES.get(model_name, "")
