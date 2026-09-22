## Build & Install instructions — Arduino CLI (ESP32)

This file documents how to install `arduino-cli`, how to build the ESP32 sketch in this repository, and the required rename of the sketch file.

### Checklist

- [x] Install `arduino-cli` on Linux
- [x] Install ESP32 core and required libraries
- [x] Rename `sketch.ino` to `simulacao.ino` inside the `simulacao` folder (required)
- [x] Compile sketch into `.bin`/`.elf` artifacts

---

## 1) Install arduino-cli (recommended)

Official installer (recommended):

```bash
# prerequisites
sudo apt update
sudo apt install -y curl unzip

# download & run the official installer
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# move the installed binary into PATH
sudo mv bin/arduino-cli /usr/local/bin/

# verify
arduino-cli version
```

### Windows installation

1. Open the [Arduino CLI download page](https://docs.arduino.cc/arduino-cli/installation/#download).
2. Download the Windows ZIP archive and extract it to a permanent folder, for example:

	```text
	C:\Program Files\Arduino CLI
	```

3. Add the extracted folder containing `arduino-cli.exe` to the user or system `Path` environment variable:
	- Open **System Properties** and select **Environment Variables**.
	- Under **User variables** or **System variables**, select `Path` and choose **Edit**.
	- Select **New**, enter the Arduino CLI folder path, and confirm all dialogs.
4. Open a new PowerShell window and verify the installation:

	```powershell
	arduino-cli version
	```

If PowerShell cannot find `arduino-cli`, confirm that the `Path` entry points to the folder that contains `arduino-cli.exe`, then open a new terminal.

Alternative (snap):

```bash
sudo snap install arduino-cli --classic
arduino-cli version
```

## 2) First-time Arduino CLI setup and ESP32 core

```bash
arduino-cli config init
arduino-cli core update-index
arduino-cli core install esp32:esp32
```

If you use a custom package index location, adjust the config accordingly.

## 3) Install required libraries

The sketch includes the following external libraries:

```bash
arduino-cli lib install "PubSubClient"
arduino-cli lib install "NTPClient"
arduino-cli lib install "ESP32Servo"
```

`WiFi.h` and `WiFiUdp.h` are provided by the ESP32 core installed in the previous step, so they do not need to be installed separately. The standard C time functions used by the sketch also require no additional library.

## 4) Prepare the sketch file (important)

Arduino expects the main `.ino` filename to match the sketch folder name in many workflows. For this project you must either:

- rename the sketch file `sketch.ino` to `simulacao.ino`, or
- put the `.ino` with the same name as its folder.

Example (from repository root):

```bash
cd simulacao
mv sketch.ino simulacao.ino
```

This ensures `arduino-cli compile` finds the correct top-level sketch file.

## 5) Compile the sketch

Replace the FQBN with the correct board for your ESP32 variant if needed.

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 /home/{your_user}/PI5/PI-V-SGHI-Automacao-Hidrica/simulacao --output-dir /home/{your_user}/PI5/PI-V-SGHI-Automacao-Hidrica/simulacao/build
```

### Windows (PowerShell)

```powershell
Set-Location C:\PI-VI-SGHI-Automacao-Hidrica\simulacao
arduino-cli compile --fqbn esp32:esp32:esp32 . --output-dir .\build
```

Adjust the `Set-Location` path if the repository is stored in a different folder. The command must be run from the folder that contains `simulacao.ino`.

After successful compilation you should find `.bin` and `.elf` files under the `build` directory.

## 6) Locate produced artifacts

```bash
ls -R /home/{your_user}/PI5/PI-V-SGHI-Automacao-Hidrica/simulacao/build
find /home/{your_user}/PI5/PI-V-SGHI-Automacao-Hidrica/simulacao/build -type f -name "*.bin" -o -name "*.elf" -o -name "*.hex"
```

ESP32 builds normally produce `.bin` and `.elf`. A `.hex` file is not required for flashing an ESP32.

## 7) Verify MQTT broker messages

In PowerShell, subscribe to the telemetry topic:

```powershell
mosquitto_sub -h broker.hivemq.com -t "sensor/umidade"
```

Keep this terminal open while the ESP32 sketch is running. Published messages from the `sensor/umidade` topic will appear in the terminal.

## 8) Convert ELF to Intel HEX (optional)

```bash
# locate the .elf produced by the previous step then:
xtensa-esp32-elf-objcopy -O ihex /path/to/sketch.elf /home/{your_user}/PI5/PI-V-SGHI-Automacao-Hidrica/simulacao/build/sketch.hex
```

If `xtensa-esp32-elf-objcopy` is not on your PATH, it is usually available inside the ESP32 toolchain installed by `arduino-cli` (look under `~/.arduino15/packages/esp32/`).

## 9) Flashing example

Using `arduino-cli` (replace the port and fqbn as required):

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 /home/{your_user}/PI5/PI-V-SGHI-Automacao-Hidrica/simulacao
```

Or use `esptool.py` with the produced `.bin` files (for advanced/partial flashing scenarios).

## Notes

- Verify the correct FQBN for your specific ESP32 board (for example `esp32:esp32:esp32`, `esp32:esp32:esp32wrover`, etc.).
- If compilation fails, check `arduino-cli compile --verbose` to see missing libraries or include path issues.

---

File created: `simulacao/BUILD_INSTRUCTIONS.md`
