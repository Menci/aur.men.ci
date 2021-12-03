#!/bin/bash

BUILD_USER="builder"
BUILD_USER_HOME="/home/builder"
BUILD_DEPENDENCIES=(
	  base-devel
)

# Patch Manjaro's mirrorlist to avoid HTTP 429
if cat /etc/os-release | head -n 1 | grep Manjaro > /dev/null; then
    if [[ "$(uname -m)" == "aarch64" ]]; then
        echo 'Server = http://mirrors.gigenet.com/manjaro/arm-stable/$repo/$arch' > /etc/pacman.d/mirrorlist
    else
        echo 'Server = http://mirrors.gigenet.com/manjaro/stable/$repo/$arch' > /etc/pacman.d/mirrorlist
    fi
fi

# Prepare dependencies
pacman -Syu ${BUILD_DEPENDENCIES[*]} --noconfirm --needed

# Prepare builder user
if ! id "$BUILD_USER" &> /dev/null; then
    useradd "$BUILD_USER" --home-dir "$BUILD_USER_HOME"
    mkdir "$BUILD_USER_HOME"
    chown "$BUILD_USER:$BUILD_USER" "$BUILD_USER_HOME"
fi
echo "$BUILD_USER ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Install yay
if pacman -Ss ^yay$ &> /dev/null; then
    # Install from rpeo
    sudo pacman -S yay --needed --noconfirm
else
    # Install from AUR
    mkdir /tmp/build-yay
    cd /tmp/build-yay
    curl https://aur.archlinux.org/cgit/aur.git/snapshot/yay-bin.tar.gz | tar xzvf -
    cd yay-bin
    chown -R "$BUILD_USER:$BUILD_USER" .
    sudo -EHu "$BUILD_USER" makepkg -sif --needed --noconfirm
    rm -rf /tmp/build-yay
fi

# Delete this script
rm -- "$0"
