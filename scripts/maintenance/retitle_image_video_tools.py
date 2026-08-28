#!/usr/bin/env python3
"""Retitle Image Tools / Video Tools templates as ``Capability: Brand``.

Updates templates/index.json and scripts/data/i18n.json title fields for all
supported hub locales. Run from repo root:

    python3 scripts/maintenance/retitle_image_video_tools.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_lib = Path(__file__).resolve().parent.parent / "lib"
if str(_lib) not in sys.path:
    sys.path.insert(0, str(_lib))

from index_format import dumps_index  # noqa: E402
from paths import I18N_FILE, TEMPLATES_DIR  # noqa: E402

LANGS = ["en", "zh", "zh-TW", "ja", "ko", "es", "fr", "ru", "tr", "ar", "pt-BR", "fa"]

# English titles: capability first, brand / variant after the colon.
TITLE_MAP: dict[str, str] = {
    # --- Image Tools ---
    "utility_seedvr2_image_upscale": "Image Upscale: SeedVR2",
    "utility_seedvr2_7b_int8_upscale_image": "Image Upscale: SeedVR2 7B Int8",
    "utility_z_image_turbo_2k_upscaler.app": "Image Upscale: Z-Image-Turbo 2K",
    "api_topaz_image_enhance_wonder3_5": "Image Upscale: Topaz Wonder 3.5",
    "utility_nanobanana_pro_ai_image_fix": "Image Upscale: Nano Banana Pro",
    "api_topaz_image_enhance_bloom2": "Image Upscale: Topaz Bloom 2",
    "api_magnific_image_upscale_creative": "Image Upscale: Magnific Creative",
    "utility_seedvr2_3b_int8_upscale_image": "Image Upscale: SeedVR2 3B Int8",
    "api_magnific_image_upscale_precise": "Image Upscale: Magnific Precise",
    "api_wavespeed_image_upscale": "Image Upscale: WaveSpeed",
    "utility_nanobanana_pro_illustration_upscale": "Image Upscale: Nano Banana Pro Illustration",
    "utility_sirolim_image_controlled_upscale": "Image Upscale: Wan 2.2 Two-Stage",
    "utility_recraft_creative_image_upscale": "Image Upscale: Recraft Creative",
    "api_wavespeed_seedvr2_ai_image_fix": "Image Upscale: WaveSpeed SeedVR2",
    "utility_interpolation_image_upscale": "Image Upscale: Traditional Interpolation",
    "utility_recraft_crisp_image_upscale": "Image Upscale: Recraft Crisp",
    "utility_topaz_illustration_upscale": "Image Upscale: Topaz Illustration",
    "utility_nanobanana_pro_product_upscale": "Image Upscale: Nano Banana Pro Product",
    "api_topaz_image_enhance": "Image Upscale: Topaz Reimagine",
    "utility-topaz_landscape_upscaler": "Image Upscale: Topaz Reimagine Landscape",
    "utility_hitpaw_general_image_enhance": "Image Upscale: HitPaw Portrait",
    "utility_pid_latent_upscale_dit": "Image Upscale: PiD Latent Decode",
    "utility_image_upscale_supir": "Image Restoration: SUPIR",
    "utility_image_segment_sam3": "Image Segmentation: SAM3",
    "utility_face_detection_mediapipe": "Face Detection: MediaPipe",
    "api_bytedance_seedream_5_0_layer_separation": "Layer Decomposition: Seedream 5.0 Pro",
    "image_qwen_image_layered": "Layer Decomposition: Qwen-Image-Layered",
    "image_qwen_image_layered_control": "Layer Decomposition: Qwen-Image-Layered Control",
    "templates_doc_workbox_klein_9b_image_extend": "Image Outpainting: Flux.2 Klein 9B",
    "api_bfl_flux1_expand_image": "Image Outpainting: Flux.1",
    "api_bria_expand_image": "Image Outpainting: Bria",
    "utility_depth_anything3_image_depth_estimation": "Depth Estimation: Depth Anything 3",
    "image_lotus_depth_v1_1": "Depth Estimation: Lotus",
    "utility_moge_depth_estimation": "Depth Estimation: MoGe",
    "api_magnific_skin_enhancer": "Portrait Enhancement: Magnific",
    "utility_birefnet_remove_background": "Remove Background: BiRefNet",
    "utility_bria_remove_image_background": "Remove Background: Bria",
    "api_bria_eraser": "Object Removal: Bria Eraser",
    "api_flux_erase_image": "Object Removal: Flux",
    "api_bria_genfill": "Inpainting: Bria Generative Fill",
    "utility_sdpose_ood_image_to_pose": "Pose Map: SDPose-OOD",
    "utility_sdpose_multi_person": "Pose Detection: SDPose Multi-Person",
    "api_flux_vto": "Virtual Try-On: Flux",
    "api_magnific_image_relight": "Relight: Magnific",
    "api_beeble_switchx_image_edit": "Relight: Beeble SwitchX",
    # --- Video Tools ---
    "utility_seedvr2_3b_int8_upscale_video": "Video Upscale: SeedVR2 3B Int8",
    "utility_seedvr2_video_upscale": "Video Upscale: SeedVR2",
    "api_topaz_starlight_precise25": "Video Upscale: Topaz Starlight Precise 2.5",
    "utility_video_upscale": "Video Upscale: Wan 2.2 Creative",
    "api_wavespeed_flshvsr_video_upscale": "Video Upscale: WaveSpeed FlashVSR",
    "api_topaz_astra2": "Video Upscale: Topaz Astra 2 Creative",
    "utility-gan_upscaler": "Video Upscale: Real-ESRGAN",
    "api_bytedance_vcube_video_enhance": "Video Upscale: ByteDance vCube",
    "api_topaz_video_enhance": "Video Upscale: Topaz Astra Fast",
    "utility_hitpaw_video_enhance": "Video Upscale: HitPaw",
    "api_bfl_flux_video_upscale": "Video Upscale: Flux 3",
    "utility_depth_anything3_video_depth_estimation": "Depth Map: Depth Anything 3",
    "utility-depthAnything-v2-relative-video": "Depth Map: Depth Anything v2",
    "utility-normal_crafter-video": "Normal Map: NormalCrafter",
    "utility-lineart-video": "Lineart Map: LineArt Preprocessor",
    "utility_video_segment_sam3": "Video Segmentation: SAM3",
    "api_grok_video_extend": "Video Extend: Grok",
    "api_seedance2_5_video_extend": "Video Extend: Seedance 2.5",
    "template_horizontal_vertical_extension": "Aspect Ratio Extend: Kling O3",
    "api_vidu_video_extension": "Video Extend: Vidu Q2",
    "api_google_gemini_omni_flash_1_1_extend": "Video Extend: Gemini Omni 1.1 Flash",
    "utility_video_frame_interpolation": "Frame Interpolation: FILM or RIFE",
    "utility-frame_interpolation-film": "Frame Interpolation: FILM",
    "utility_gimm_frame_interpolation": "Frame Interpolation: GIMM-VFI",
    "utility_void_video_inpainting": "Video Inpainting: VOID",
    "api_bria_video_replace_background": "Replace Background: Bria",
    "api_bria_remove_video_background_transparent": "Remove Background: Bria Transparent",
    "api_bria_remove_video_background": "Remove Background: Bria Solid Color",
    "api_bria_video_green_screen": "Green Screen: Bria",
    "utility-bria_remove_video_background": "Remove Background: Bria Local",
    "api_beeble_switchx_video_edit": "Video Edit: Beeble SwitchX",
    "templates_purz_crossfade": "Video Edit: Crossfade Merge",
    "utility-openpose-video": "Pose Map: DWPose OpenPose",
    "utility_sdpose_ood_video_to_pose_map": "Pose Map: SDPose-OOD",
    "utility_sdpose_multi_person_video": "Pose Detection: SDPose Multi-Person",
}

CAP_I18N: dict[str, dict[str, str]] = {
    "Image Upscale": {
        "en": "Image Upscale",
        "zh": "图像放大",
        "zh-TW": "圖像放大",
        "ja": "画像アップスケール",
        "ko": "이미지 업스케일",
        "es": "Ampliación de imagen",
        "fr": "Agrandissement d'image",
        "ru": "Апскейл изображения",
        "tr": "Görüntü Büyütme",
        "ar": "تكبير الصورة",
        "pt-BR": "Ampliação de imagem",
        "fa": "بزرگ‌نمایی تصویر",
    },
    "Image Restoration": {
        "en": "Image Restoration",
        "zh": "图像修复",
        "zh-TW": "圖像修復",
        "ja": "画像復元",
        "ko": "이미지 복원",
        "es": "Restauración de imagen",
        "fr": "Restauration d'image",
        "ru": "Восстановление изображения",
        "tr": "Görüntü Restorasyonu",
        "ar": "استعادة الصورة",
        "pt-BR": "Restauração de imagem",
        "fa": "بازسازی تصویر",
    },
    "Image Segmentation": {
        "en": "Image Segmentation",
        "zh": "图像分割",
        "zh-TW": "圖像分割",
        "ja": "画像セグメンテーション",
        "ko": "이미지 세그멘테이션",
        "es": "Segmentación de imagen",
        "fr": "Segmentation d'image",
        "ru": "Сегментация изображения",
        "tr": "Görüntü Segmentasyonu",
        "ar": "تقسيم الصورة",
        "pt-BR": "Segmentação de imagem",
        "fa": "بخش‌بندی تصویر",
    },
    "Face Detection": {
        "en": "Face Detection",
        "zh": "人脸检测",
        "zh-TW": "人臉檢測",
        "ja": "顔検出",
        "ko": "얼굴 감지",
        "es": "Detección facial",
        "fr": "Détection de visage",
        "ru": "Детекция лиц",
        "tr": "Yüz Algılama",
        "ar": "كشف الوجه",
        "pt-BR": "Detecção facial",
        "fa": "تشخیص چهره",
    },
    "Layer Decomposition": {
        "en": "Layer Decomposition",
        "zh": "图层分解",
        "zh-TW": "圖層分解",
        "ja": "レイヤー分解",
        "ko": "레이어 분해",
        "es": "Descomposición en capas",
        "fr": "Décomposition en calques",
        "ru": "Разложение на слои",
        "tr": "Katman Ayrıştırma",
        "ar": "تفكيك الطبقات",
        "pt-BR": "Decomposição em camadas",
        "fa": "تجزیه لایه",
    },
    "Image Outpainting": {
        "en": "Image Outpainting",
        "zh": "图像扩图",
        "zh-TW": "圖像擴圖",
        "ja": "画像アウトペイント",
        "ko": "이미지 아웃페인팅",
        "es": "Outpainting de imagen",
        "fr": "Outpainting d'image",
        "ru": "Аутпейнтинг изображения",
        "tr": "Görüntü Outpainting",
        "ar": "توسيع الصورة",
        "pt-BR": "Outpainting de imagem",
        "fa": "گسترش تصویر",
    },
    "Depth Estimation": {
        "en": "Depth Estimation",
        "zh": "深度估计",
        "zh-TW": "深度估計",
        "ja": "深度推定",
        "ko": "깊이 추정",
        "es": "Estimación de profundidad",
        "fr": "Estimation de profondeur",
        "ru": "Оценка глубины",
        "tr": "Derinlik Tahmini",
        "ar": "تقدير العمق",
        "pt-BR": "Estimativa de profundidade",
        "fa": "برآورد عمق",
    },
    "Portrait Enhancement": {
        "en": "Portrait Enhancement",
        "zh": "人像增强",
        "zh-TW": "人像增強",
        "ja": "ポートレート強調",
        "ko": "인물 사진 향상",
        "es": "Mejora de retrato",
        "fr": "Amélioration de portrait",
        "ru": "Улучшение портрета",
        "tr": "Portre İyileştirme",
        "ar": "تحسين الصورة الشخصية",
        "pt-BR": "Aprimoramento de retrato",
        "fa": "بهبود پرتره",
    },
    "Remove Background": {
        "en": "Remove Background",
        "zh": "去背景",
        "zh-TW": "去背景",
        "ja": "背景除去",
        "ko": "배경 제거",
        "es": "Eliminar fondo",
        "fr": "Suppression de l'arrière-plan",
        "ru": "Удаление фона",
        "tr": "Arka Plan Kaldırma",
        "ar": "إزالة الخلفية",
        "pt-BR": "Remover fundo",
        "fa": "حذف پس‌زمینه",
    },
    "Object Removal": {
        "en": "Object Removal",
        "zh": "物体移除",
        "zh-TW": "物體移除",
        "ja": "オブジェクト除去",
        "ko": "객체 제거",
        "es": "Eliminación de objetos",
        "fr": "Suppression d'objet",
        "ru": "Удаление объектов",
        "tr": "Nesne Kaldırma",
        "ar": "إزالة الكائن",
        "pt-BR": "Remoção de objetos",
        "fa": "حذف شیء",
    },
    "Inpainting": {
        "en": "Inpainting",
        "zh": "局部重绘",
        "zh-TW": "局部重繪",
        "ja": "インペイント",
        "ko": "인페인팅",
        "es": "Inpainting",
        "fr": "Inpainting",
        "ru": "Инпейнтинг",
        "tr": "Inpainting",
        "ar": "الرسم الداخلي",
        "pt-BR": "Inpainting",
        "fa": "Inpainting",
    },
    "Pose Map": {
        "en": "Pose Map",
        "zh": "姿态图",
        "zh-TW": "姿態圖",
        "ja": "ポーズマップ",
        "ko": "포즈 맵",
        "es": "Mapa de pose",
        "fr": "Carte de pose",
        "ru": "Карта позы",
        "tr": "Poz Haritası",
        "ar": "خريطة الوضعية",
        "pt-BR": "Mapa de pose",
        "fa": "نقشه پوز",
    },
    "Pose Detection": {
        "en": "Pose Detection",
        "zh": "姿态检测",
        "zh-TW": "姿態檢測",
        "ja": "ポーズ検出",
        "ko": "포즈 감지",
        "es": "Detección de pose",
        "fr": "Détection de pose",
        "ru": "Детекция позы",
        "tr": "Poz Algılama",
        "ar": "كشف الوضعية",
        "pt-BR": "Detecção de pose",
        "fa": "تشخیص پوز",
    },
    "Virtual Try-On": {
        "en": "Virtual Try-On",
        "zh": "虚拟试穿",
        "zh-TW": "虛擬試穿",
        "ja": "バーチャル試着",
        "ko": "가상 착용",
        "es": "Prueba virtual",
        "fr": "Essayage virtuel",
        "ru": "Виртуальная примерка",
        "tr": "Sanal Deneme",
        "ar": "تجربة افتراضية",
        "pt-BR": "Prova virtual",
        "fa": "امتحان مجازی",
    },
    "Relight": {
        "en": "Relight",
        "zh": "重打光",
        "zh-TW": "重打光",
        "ja": "リライト",
        "ko": "리라이트",
        "es": "Reiluminación",
        "fr": "Relighting",
        "ru": "Пересвет",
        "tr": "Yeniden Aydınlatma",
        "ar": "إعادة الإضاءة",
        "pt-BR": "Reluzir",
        "fa": "نورپردازی مجدد",
    },
    "Video Upscale": {
        "en": "Video Upscale",
        "zh": "视频放大",
        "zh-TW": "影片放大",
        "ja": "動画アップスケール",
        "ko": "비디오 업스케일",
        "es": "Ampliación de vídeo",
        "fr": "Agrandissement vidéo",
        "ru": "Апскейл видео",
        "tr": "Video Büyütme",
        "ar": "تكبير الفيديو",
        "pt-BR": "Ampliação de vídeo",
        "fa": "بزرگ‌نمایی ویدیو",
    },
    "Depth Map": {
        "en": "Depth Map",
        "zh": "深度图",
        "zh-TW": "深度圖",
        "ja": "深度マップ",
        "ko": "깊이 맵",
        "es": "Mapa de profundidad",
        "fr": "Carte de profondeur",
        "ru": "Карта глубины",
        "tr": "Derinlik Haritası",
        "ar": "خريطة العمق",
        "pt-BR": "Mapa de profundidade",
        "fa": "نقشه عمق",
    },
    "Normal Map": {
        "en": "Normal Map",
        "zh": "法线图",
        "zh-TW": "法線圖",
        "ja": "法線マップ",
        "ko": "노말 맵",
        "es": "Mapa normal",
        "fr": "Carte normale",
        "ru": "Карта нормалей",
        "tr": "Normal Harita",
        "ar": "خريطة النورمال",
        "pt-BR": "Mapa normal",
        "fa": "نقشه نرمال",
    },
    "Lineart Map": {
        "en": "Lineart Map",
        "zh": "线稿图",
        "zh-TW": "線稿圖",
        "ja": "線画マップ",
        "ko": "라인아트 맵",
        "es": "Mapa de lineart",
        "fr": "Carte lineart",
        "ru": "Карта контуров",
        "tr": "Çizgi Haritası",
        "ar": "خريطة الخطوط",
        "pt-BR": "Mapa de lineart",
        "fa": "نقشه خطی",
    },
    "Video Segmentation": {
        "en": "Video Segmentation",
        "zh": "视频分割",
        "zh-TW": "影片分割",
        "ja": "動画セグメンテーション",
        "ko": "비디오 세그멘테이션",
        "es": "Segmentación de vídeo",
        "fr": "Segmentation vidéo",
        "ru": "Сегментация видео",
        "tr": "Video Segmentasyonu",
        "ar": "تقسيم الفيديو",
        "pt-BR": "Segmentação de vídeo",
        "fa": "بخش‌بندی ویدیو",
    },
    "Video Extend": {
        "en": "Video Extend",
        "zh": "视频扩展",
        "zh-TW": "影片擴展",
        "ja": "動画拡張",
        "ko": "비디오 확장",
        "es": "Extensión de vídeo",
        "fr": "Extension vidéo",
        "ru": "Расширение видео",
        "tr": "Video Uzatma",
        "ar": "تمديد الفيديو",
        "pt-BR": "Extensão de vídeo",
        "fa": "گسترش ویدیو",
    },
    "Aspect Ratio Extend": {
        "en": "Aspect Ratio Extend",
        "zh": "画幅扩展",
        "zh-TW": "畫幅擴展",
        "ja": "アスペクト比拡張",
        "ko": "화면 비율 확장",
        "es": "Extensión de relación de aspecto",
        "fr": "Extension du format",
        "ru": "Расширение формата",
        "tr": "En Boy Oranı Genişletme",
        "ar": "توسيع نسبة العرض إلى الارتفاع",
        "pt-BR": "Extensão de proporção",
        "fa": "گسترش نسبت تصویر",
    },
    "Frame Interpolation": {
        "en": "Frame Interpolation",
        "zh": "帧插值",
        "zh-TW": "幀插值",
        "ja": "フレーム補間",
        "ko": "프레임 보간",
        "es": "Interpolación de fotogramas",
        "fr": "Interpolation d'images",
        "ru": "Интерполяция кадров",
        "tr": "Kare Enterpolasyonu",
        "ar": "استيفاء الإطارات",
        "pt-BR": "Interpolação de quadros",
        "fa": "درون‌یابی فریم",
    },
    "Video Inpainting": {
        "en": "Video Inpainting",
        "zh": "视频局部重绘",
        "zh-TW": "影片局部重繪",
        "ja": "動画インペイント",
        "ko": "비디오 인페인팅",
        "es": "Inpainting de vídeo",
        "fr": "Inpainting vidéo",
        "ru": "Инпейнтинг видео",
        "tr": "Video Inpainting",
        "ar": "الرسم الداخلي للفيديو",
        "pt-BR": "Inpainting de vídeo",
        "fa": "Inpainting ویدیو",
    },
    "Replace Background": {
        "en": "Replace Background",
        "zh": "替换背景",
        "zh-TW": "替換背景",
        "ja": "背景置換",
        "ko": "배경 교체",
        "es": "Reemplazar fondo",
        "fr": "Remplacement de l'arrière-plan",
        "ru": "Замена фона",
        "tr": "Arka Plan Değiştirme",
        "ar": "استبدال الخلفية",
        "pt-BR": "Substituir fundo",
        "fa": "جایگزینی پس‌زمینه",
    },
    "Green Screen": {
        "en": "Green Screen",
        "zh": "绿幕抠像",
        "zh-TW": "綠幕去背",
        "ja": "グリーンスクリーン",
        "ko": "그린 스크린",
        "es": "Pantalla verde",
        "fr": "Fond vert",
        "ru": "Зелёный экран",
        "tr": "Yeşil Perde",
        "ar": "الشاشة الخضراء",
        "pt-BR": "Tela verde",
        "fa": "پرده سبز",
    },
    "Video Edit": {
        "en": "Video Edit",
        "zh": "视频编辑",
        "zh-TW": "影片編輯",
        "ja": "動画編集",
        "ko": "비디오 편집",
        "es": "Edición de vídeo",
        "fr": "Édition vidéo",
        "ru": "Редактирование видео",
        "tr": "Video Düzenleme",
        "ar": "تحرير الفيديو",
        "pt-BR": "Edição de vídeo",
        "fa": "ویرایش ویدیو",
    },
}


def title_i18n(en_title: str) -> dict[str, str]:
    if ": " not in en_title:
        raise ValueError(f"Expected 'Capability: Brand' format, got {en_title!r}")
    capability, brand = en_title.split(": ", 1)
    if capability not in CAP_I18N:
        raise KeyError(f"Missing CAP_I18N entry for {capability!r}")
    return {lang: f"{CAP_I18N[capability][lang]}: {brand}" for lang in LANGS}


def apply_titles() -> None:
    index_path = TEMPLATES_DIR / "index.json"
    data = json.loads(index_path.read_text(encoding="utf-8"))

    tool_names = set()
    for cat in data:
        if cat.get("title") in {"Image Tools", "Video Tools"}:
            for t in cat["templates"]:
                tool_names.add(t["name"])

    missing = tool_names - set(TITLE_MAP)
    extra = set(TITLE_MAP) - tool_names
    if missing:
        raise SystemExit(f"Templates missing from TITLE_MAP: {sorted(missing)}")
    if extra:
        raise SystemExit(f"TITLE_MAP has unknown templates: {sorted(extra)}")

    updated = 0
    for cat in data:
        if cat.get("title") not in {"Image Tools", "Video Tools"}:
            continue
        for t in cat["templates"]:
            new_title = TITLE_MAP[t["name"]]
            if t.get("title") != new_title:
                t["title"] = new_title
                updated += 1

    text = dumps_index(data)
    if not text.endswith("\n"):
        text += "\n"
    index_path.write_text(text, encoding="utf-8")
    print(f"Updated {updated} titles in {index_path}")

    i18n = json.loads(I18N_FILE.read_text(encoding="utf-8"))
    templates_i18n = i18n.setdefault("templates", {})
    i18n_updated = 0
    for name, en_title in TITLE_MAP.items():
        entry = templates_i18n.setdefault(name, {})
        entry["title"] = title_i18n(en_title)
        i18n_updated += 1

    I18N_FILE.write_text(json.dumps(i18n, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated title i18n for {i18n_updated} templates in {I18N_FILE}")


if __name__ == "__main__":
    apply_titles()
