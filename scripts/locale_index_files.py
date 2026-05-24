"""Locale index filenames under templates/ — shared by sync and validation scripts."""

# Language-specific index files (English master is index.json, handled separately).
LANGUAGE_FILES: dict[str, str] = {
    "zh": "index.zh.json",
    "zh-TW": "index.zh-TW.json",
    "ja": "index.ja.json",
    "ko": "index.ko.json",
    "es": "index.es.json",
    "fr": "index.fr.json",
    "ru": "index.ru.json",
    "tr": "index.tr.json",
    "ar": "index.ar.json",
    "fa": "index.fa.json",
    "pt-BR": "index.pt-BR.json",
}

# Files in templates/ that are not workflow JSON or template media assets.
TEMPLATES_NON_WORKFLOW_FILES: frozenset[str] = frozenset(
    {
        "index.json",
        *LANGUAGE_FILES.values(),
        "index.schema.json",
        "index_logo.json",
        "fuse_options.json",
        ".gitignore",
        "README.md",
        ".DS_Store",
    }
)
