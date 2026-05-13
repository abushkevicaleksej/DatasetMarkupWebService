# Dataset Markup Web Service
This repository contains the implementation of a web service designed for semi-automatic annotation of visual data. It provides tools to streamline and accelerate the labeling process for images and videos by combining automated methods with user input.
<img width="692" height="388" alt="2026-05-13 10-10-49 — копия" src="https://github.com/user-attachments/assets/8fcc4c31-6675-43d0-878b-f996d6435fe1" />


# Notice
App is currently in development mode, but you can try it now!

# Installation
First thing first, you need to clone the repository:
```
git clone https://github.com/abushkevicaleksej/DatasetMarkupWebService.git
cd DatasetMarkupWebService
```

Then, you need to install Node.js for frontend performing. Go to https://nodejs.org/en/download

Then, install uv with our standalone installers:

```bash
# On macOS and Linux.
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```bash
# On Windows.
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Or, from [PyPI](https://pypi.org/project/uv/):

```bash
# With pip.
pip install uv
```

```bash
# Or pipx.
pipx install uv
```

If installed via the standalone installer, uv can update itself to the latest version:

```bash
uv self update
```

See the [installation documentation](https://docs.astral.sh/uv/getting-started/installation/) for
details and alternative installation methods.

### Next you need to start frontend and backend services:

```bash
cd ./frontend/
npm run dev
```
In the other terminal:
```bash
.venv/Scripts/activate
cd ./backend/
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Then go to **localhost:5173**. Also see docs **[here](https://abushkevicaleksej.github.io/DatasetMarkupWebService/)**
