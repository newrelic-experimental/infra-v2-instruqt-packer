packer {
  required_plugins {
    googlecompute = {
      version = ">= 0.0.1"
      source = "github.com/hashicorp/googlecompute"
    }
  }
}

source "googlecompute" "npm-instruqt" {
  project_id = "nrge-316315"
  source_image_family = "ubuntu-2004-lts"
  ssh_username = "packer"
  zone = "us-central1-a"
  image_name = "network-performance-monitoring-instruqt"
}

build {
  sources = ["sources.googlecompute.npm-instruqt"]

  provisioner "shell" {
    scripts = [
        "./scripts/install-dependencies.sh",
        "./scripts/setup-docker.sh",
    ]
  }
}