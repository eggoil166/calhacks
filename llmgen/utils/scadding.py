def save_openscad(code: str, path: str = "output.txt"):
    with open(path, "w") as f:
        f.write(code)