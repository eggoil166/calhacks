module sphere() {
    sphere(r=50, $fn=100);
}

module assembly() {
    sphere();
}

assembly();