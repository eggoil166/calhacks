from gradio_client import Client, handle_file

client = Client("tencent/Hunyuan3D-2")
result = client.predict(
		caption="Eric Zou, a male human being, Asian ethnicity",
		image=handle_file("./ims/IMG_6243.jpeg"),
		mv_image_front=handle_file("./ims/IMG_6239.jpeg"),
		mv_image_back=handle_file("./ims/IMG_6241.jpeg"),
		mv_image_left=handle_file("./ims/IMG_6242.jpeg"),
		mv_image_right=handle_file("./ims/IMG_6240.jpeg"),
		steps=32,
		guidance_scale=5.5,
		seed=42,
		octree_resolution=256,
		check_box_rembg=True,
		num_chunks=8000,
		randomize_seed=False,
		api_name="/shape_generation"
)
print(result)