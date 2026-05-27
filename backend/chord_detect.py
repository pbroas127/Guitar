import numpy as np
import librosa

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Krumhansl-Schmuckler key profiles
KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

def _normalize(v):
    n = np.linalg.norm(v)
    return v / n if n > 0 else v

def _build_chord_templates():
    templates = {}
    for i, note in enumerate(NOTES):
        maj = np.zeros(12)
        maj[i] = 1.0
        maj[(i + 4) % 12] = 0.8
        maj[(i + 7) % 12] = 0.8
        templates[note] = _normalize(maj)

        min_ = np.zeros(12)
        min_[i] = 1.0
        min_[(i + 3) % 12] = 0.8
        min_[(i + 7) % 12] = 0.8
        templates[f'{note}m'] = _normalize(min_)
    return templates

TEMPLATES = _build_chord_templates()

def detect_key(chroma_mean: np.ndarray) -> tuple[str, str]:
    """Return (key_name, mode) e.g. ('G', 'major')"""
    c = _normalize(chroma_mean)
    best_score, best_key, best_mode = -np.inf, 'C', 'major'
    for i, note in enumerate(NOTES):
        maj = np.roll(KS_MAJOR, i)
        score = np.dot(c, _normalize(np.array(maj)))
        if score > best_score:
            best_score, best_key, best_mode = score, note, 'major'
        min_ = np.roll(KS_MINOR, i)
        score = np.dot(c, _normalize(np.array(min_)))
        if score > best_score:
            best_score, best_key, best_mode = score, note, 'minor'
    return best_key, best_mode

def suggest_capo(key: str, mode: str) -> int:
    """Return capo fret that puts the key in the most guitar-friendly position."""
    friendly_major = {'C', 'G', 'D', 'A', 'E'}
    friendly_minor = {'Am', 'Em', 'Dm', 'Bm'}
    note_idx = NOTES.index(key) if key in NOTES else 0
    chord_name = key if mode == 'major' else f'{key}m'
    friendly = friendly_major if mode == 'major' else friendly_minor

    if chord_name in friendly or key in friendly:
        return 0

    for capo in range(1, 8):
        transposed_idx = (note_idx - capo) % 12
        transposed = NOTES[transposed_idx]
        transposed_chord = transposed if mode == 'major' else f'{transposed}m'
        if transposed_chord in friendly or transposed in friendly:
            return capo
    return 0

def match_chord(chroma: np.ndarray) -> str:
    c = _normalize(chroma)
    best, best_score = 'N', 0.4  # threshold
    for name, template in TEMPLATES.items():
        score = float(np.dot(c, template))
        if score > best_score:
            best_score, best = score, name
    return best

def smooth_chords(chords: list[str], window: int = 3) -> list[str]:
    """Majority vote over a sliding window to reduce noise."""
    from collections import Counter
    out = []
    for i in range(len(chords)):
        start = max(0, i - window)
        end = min(len(chords), i + window + 1)
        chunk = chords[start:end]
        most_common = Counter(chunk).most_common(1)[0][0]
        out.append(most_common)
    return out

def analyze_audio(path: str, max_duration: int = 240) -> dict:
    """
    Analyze a local audio file and return chord timeline, key, capo, tempo.
    max_duration: only analyze first N seconds (saves time on long songs).
    """
    y, sr = librosa.load(path, sr=22050, duration=max_duration, mono=True)

    # Tempo / beat tracking
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    # Chromagram (CQT-based, more accurate than STFT for guitar)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=36)

    # Key from full-song chroma
    key, mode = detect_key(chroma.mean(axis=1))
    capo = suggest_capo(key, mode)

    # Sync chroma to beat frames for cleaner chord detection
    beat_chroma = librosa.util.sync(chroma, beat_frames, aggregate=np.median)

    # Detect chord at each beat
    raw_chords = [match_chord(beat_chroma[:, i]) for i in range(beat_chroma.shape[1])]
    smoothed = smooth_chords(raw_chords, window=2)

    # Collapse consecutive identical chords into segments
    segments = []
    prev_chord, seg_start = None, 0.0
    for i, chord in enumerate(smoothed):
        t = float(beat_times[i]) if i < len(beat_times) else 0
        if chord != prev_chord:
            if prev_chord and prev_chord != 'N':
                segments.append({'chord': prev_chord, 'start': seg_start, 'end': t})
            prev_chord, seg_start = chord, t
    if prev_chord and prev_chord != 'N':
        segments.append({'chord': prev_chord, 'start': seg_start, 'end': float(beat_times[-1]) if len(beat_times) else 0})

    # Build simple chord chart (unique chords in order of first appearance)
    seen, chord_order = set(), []
    for s in segments:
        if s['chord'] not in seen:
            seen.add(s['chord'])
            chord_order.append(s['chord'])

    return {
        'key': key,
        'mode': mode,
        'capo': capo,
        'tempo': round(float(tempo)),
        'segments': segments,
        'unique_chords': chord_order,
    }
