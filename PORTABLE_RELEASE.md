# Portable Windows release

Build with `npm install` and `npm run build:portable`. The distributable is the single file `release/Unlimited-Image-Studio.exe`. Copy that EXE to any writable folder and run it without installation.

On launch, the app creates these folders beside the EXE:

```text
release/
  Unlimited-Image-Studio.exe
  data/
    profile/
    library/
    projects/
    settings/
  models/
    qwen-image-2.1/
  runtime/
  downloads/
  logs/
  cache/
```

At first setup, the app detects physical graphics adapters. If several are present, the user chooses one before any downloads start. NVIDIA VRAM is measured with `nvidia-smi`; for another card whose VRAM cannot be measured reliably, setup asks the user to choose its memory range. It suggests a Qwen-Image-2.1 GGUF weight from that capacity and offers lighter compatible weights. The selected model, VAE, Qwen3-VL encoder and vision projector, and stable-diffusion.cpp Vulkan and CPU runtimes download beside the EXE. NVIDIA selection also installs CUDA and its support libraries. Downloads are resumable and checked against pinned sizes and SHA-256 hashes. The total transfer depends on the selected weight. The local model and runtime files are not embedded in the EXE.

To update, close the app and replace only `Unlimited-Image-Studio.exe`. The model files, image library, profile, and settings stay in the same folder and are reused after verification. Rebuilding copies the new EXE into `release/` without deleting anything else there.

The portable Electron target temporarily extracts its application code to the Windows temporary directory while running. Persistent app files remain beside the EXE. The EXE itself is not an installer. Use a writable folder with enough space for the downloads and extracted runtime.

The Generate button runs Qwen-Image-2.1 locally and saves PNG files with prompt details in `data/library`. The app uses the selected GPU where the local runtime exposes it, and falls back to CPU. On the current validation machine, CUDA generation works when enough VRAM is free; other GPUs and the lighter weights still need hands-on render validation. The slim system bar shows CPU and RAM use, plus GPU and VRAM use when NVIDIA telemetry is available. Settings can reopen setup to change GPU or weight. The separate AI prompt-refinement button and image editing controls remain future work.
