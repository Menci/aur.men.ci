#!/bin/bash

if [[ "$PACKAGE_TYPE" == "pacman" ]]; then
    # Patch Manjaro's mirrorlist to avoid HTTP 429
    if cat /etc/pacman.conf | grep manjaro > /dev/null; then
        if [[ "$(uname -m)" == "aarch64" ]]; then
            echo 'Server = http://mirrors.gigenet.com/manjaro/arm-stable/$repo/$arch' > /etc/pacman.d/mirrorlist
        else
            echo 'Server = http://mirrors.gigenet.com/manjaro/stable/$repo/$arch' > /etc/pacman.d/mirrorlist
        fi
    fi

    pacman -Syu base-devel --noconfirm --needed
elif [[ "$PACKAGE_TYPE" == "deb" ]]; then
    echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

    INITIALIZE_DEPENDENCIES=(
        gpg
        wget
        apt-transport-https
    )
    apt-get update
    apt-get dist-upgrade -y
    apt-get install -y "${INITIALIZE_DEPENDENCIES[@]}"

    # Add makedeb repo
    wget -qO - 'https://proget.makedeb.org/debian-feeds/makedeb.pub' | gpg --dearmor | tee /usr/share/keyrings/makedeb-archive-keyring.gpg 1> /dev/null
    echo 'deb [signed-by=/usr/share/keyrings/makedeb-archive-keyring.gpg arch=all] https://proget.makedeb.org/ makedeb main' | tee /etc/apt/sources.list.d/makedeb.list

    BUILD_DEPENDENCIES=(
        sudo
        build-essential
        makedeb
        git
        devscripts
        equivs
    )
    apt-get update && apt-get install -y "${BUILD_DEPENDENCIES[@]}"

    # Inject arguments to makedeb with a wrapper
    MAKEDEB_WRAPPER="/usr/local/bin/makedeb"
    echo '#!/bin/bash' >> "$MAKEDEB_WRAPPER"
    echo '/usr/bin/makedeb --ignore-arch --skip-pgp-check --no-confirm "$@"' >> "$MAKEDEB_WRAPPER"
    chmod +x "$MAKEDEB_WRAPPER"

    # makedeb's makepkg.conf is broken
    echo 'unset CARCH CHOST CFLAGS CXXFLAGS LDFLAGS' >> /etc/makepkg.conf
fi

# Prepare builder user
BUILD_USER="builder"
BUILD_USER_HOME="/home/$BUILD_USER"
if ! id "$BUILD_USER" &> /dev/null; then
    useradd "$BUILD_USER" --home-dir "$BUILD_USER_HOME"
    mkdir "$BUILD_USER_HOME"
    chown "$BUILD_USER:$BUILD_USER" "$BUILD_USER_HOME"
fi
echo "$BUILD_USER ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Install package helper
if [[ "$PACKAGE_TYPE" == "pacman" ]]; then
    # yay
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
elif [[ "$PACKAGE_TYPE" == "deb" ]]; then
    # una
    git clone https://mpr.makedeb.org/una-bin /tmp/una-bin
    cd /tmp/una-bin
    mkdir /etc/una # AFK-OS/una#24
    chown -R "$BUILD_USER:$BUILD_USER" .
    sudo -u "$BUILD_USER" makedeb -si
    rm -rf /tmp/una-bin
fi

# Delete this script
rm -- "$0"
