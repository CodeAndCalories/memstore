from setuptools import setup, find_packages

setup(
    name="memstore-client",
    version="0.1.0",
    description="Persistent memory API for AI agents",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Memstore",
    author_email="hello@memstore.dev",
    url="https://github.com/CodeAndCalories/memstore",
    packages=find_packages(),
    install_requires=["requests>=2.28.0"],
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
    ],
)
