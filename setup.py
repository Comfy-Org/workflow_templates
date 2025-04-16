from setuptools import setup, find_packages

setup(
    name="comfyui_workflow_templates",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "comfyui_workflow_templates": ["templates/*"],
    },
    install_requires=[],
    python_requires=">=3.9",
    url="https://github.com/Comfy-Org/workflow_templates",
)
