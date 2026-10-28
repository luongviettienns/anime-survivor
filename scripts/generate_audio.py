"""Deterministic procedural retro-anime SFX generator (16-bit mono 22050Hz WAV)."""
from __future__ import annotations
import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_OUT = ROOT / 'public/assets/audio'
SAMPLE_RATE = 22050


def _write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for sample in samples:
            clamped = max(-1.0, min(1.0, sample))
            frames.extend(struct.pack('<h', int(clamped * 32767)))
        wf.writeframes(bytes(frames))


def _pseudo_noise(index: int) -> float:
    raw = math.sin(index * 12.9898 + 78.233) * 43758.5453
    return (raw - math.floor(raw)) * 2.0 - 1.0


def _synth_sweep(duration_sec: float, f_start: float, f_end: float, amp: float, noise_mix: float = 0.0) -> list[float]:
    count = int(SAMPLE_RATE * duration_sec)
    samples: list[float] = []
    phase = 0.0
    for i in range(count):
        t = i / max(1, count - 1)
        freq = f_start + (f_end - f_start) * t
        phase += (2.0 * math.pi * freq) / SAMPLE_RATE
        env = ((1.0 - t) ** 1.45) * min(1.0, i / 40.0)
        tone = math.sin(phase) * (1.0 - noise_mix) + _pseudo_noise(i) * noise_mix
        samples.append(tone * env * amp)
    return samples


def _synth_chime(duration_sec: float, f_first: float, f_second: float, amp: float) -> list[float]:
    count = int(SAMPLE_RATE * duration_sec)
    samples: list[float] = []
    phase = 0.0
    for i in range(count):
        t = i / max(1, count - 1)
        freq = f_first if t < 0.45 else f_second
        phase += (2.0 * math.pi * freq) / SAMPLE_RATE
        env = ((1.0 - t) ** 1.15) * min(1.0, i / 30.0)
        samples.append((math.sin(phase) + 0.3 * math.sin(phase * 2.0)) * 0.77 * env * amp)
    return samples


def _synth_triad(duration_sec: float, notes: list[float], amp: float) -> list[float]:
    count = int(SAMPLE_RATE * duration_sec)
    samples: list[float] = []
    phase = 0.0
    step = max(1, count // len(notes))
    for i in range(count):
        idx = min(len(notes) - 1, i // step)
        local_t = (i % step) / max(1, step - 1)
        freq = notes[idx]
        phase += (2.0 * math.pi * freq) / SAMPLE_RATE
        env = (1.0 - local_t * 0.45) * min(1.0, (i % step) / 25.0)
        samples.append((math.sin(phase) + 0.25 * math.sin(phase * 2.0)) * 0.8 * env * amp)
    return samples


def generate_audio(out_dir: Path = AUDIO_OUT) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_wav(out_dir / 'shoot.wav', _synth_sweep(0.09, 680.0, 320.0, 0.42))
    _write_wav(out_dir / 'slash.wav', _synth_sweep(0.11, 520.0, 180.0, 0.45, noise_mix=0.55))
    _write_wav(out_dir / 'hit.wav', _synth_sweep(0.08, 240.0, 90.0, 0.52, noise_mix=0.2))
    _write_wav(out_dir / 'pickup.wav', _synth_chime(0.10, 880.0, 1320.0, 0.40))
    _write_wav(out_dir / 'levelup.wav', _synth_triad(0.26, [523.25, 659.25, 783.99, 1046.50], 0.44))
    _write_wav(out_dir / 'hurt.wav', _synth_sweep(0.16, 180.0, 110.0, 0.50, noise_mix=0.15))


if __name__ == '__main__':
    generate_audio()
    print('Generated procedural WAV sound effects in public/assets/audio.')
