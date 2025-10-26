This model creates a simple 10 millimeter cube, which is a basic three-dimensional square block. It's centered at the origin and has equal dimensions on all sides.

module cube_part() {
    cube([10, 10, 10], center=true);
}

module assembly() {
    cube_part();
}

assembly();