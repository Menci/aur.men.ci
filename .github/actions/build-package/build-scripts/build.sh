#!/bin/bash -e

# Environment variables:
#
# - PACKAGE_TYPE
# - REPO_URL
# - PACKAGE_NAME

if [[ "$PACKAGE_TYPE" == "pacman" ]]; then
	MAKEPKG_CMD="makepkg"
	MAKEPKG_FLAGS="-sfA --needed --noconfirm --nocheck --skippgpcheck"
elif [[ "$PACKAGE_TYPE" == "deb" ]]; then
	MAKEPKG_CMD="makedeb"
	MAKEPKG_FLAGS=""
fi

function install_dependencies() {
	if [[ "$DEPENDENCIES_INSTALLED" == "true" ]]; then
		return 0
	fi
	DEPENDENCIES_INSTALLED="true"

	(
		# Run "source PKGBUILD" in a subshell
		source PKGBUILD

		# makedeb's una doesn't support version expression
		DEPENDS=$(
			if [[ "$PACKAGE_TYPE" == "pacman" ]]; then
				echo ${makedepends[*]} ${depends[*]} $EXTRA_BUILD_DEPENDENCIES
			elif [[ "$PACKAGE_TYPE" == "deb" ]]; then
				for DEPEND in ${makedepends[*]} ${depends[*]} $EXTRA_BUILD_DEPENDENCIES; do
					echo $DEPEND | cut -d'>' -f 1 | cut -d'=' -f 1
				done
			fi
		)

		# Install dependencies with package helper
		if [[ "$PACKAGE_TYPE" == "pacman" ]]; then
			yay -Syu $DEPENDS --needed --noconfirm --mflags "--nocheck --skippgpcheck"
		elif [[ "$PACKAGE_TYPE" == "deb" ]]; then
			sudo apt-get update

			APT_DEPENDS=()
			MPR_DEPENDS=()
			for DEPEND in $DEPENDS; do
				if apt-cache show "$DEPEND" | grep -qvz 'State:.*(virtual)'; then
					APT_DEPENDS+=("$DEPEND")
				else
					MPR_DEPENDS+=("$DEPEND")
				fi
			done

			if [[ "${APT_DEPENDS[*]}" != "" ]]; then
				sudo apt-get install -y ${APT_DEPENDS[*]}
			fi
			if [[ "${MPR_DEPENDS[*]}" != "" ]]; then
				una update && una install ${MPR_DEPENDS[*]}
				echo # Fix una extra output
			fi
		fi
	)
}

echo "::group::Parsing PKGBUILD"

# Copy PKGBUILD and other required files
cp -r /pkgbuild/. .

function resolve_dynamic_pkgver() {
	# Check if version is static
	STATIC_PKGVER="$(
		source PKGBUILD >/dev/null
		if [[ "$(type -t pkgver)" != "function" ]]; then
			echo "$pkgver"
		fi
	)"
	if [[ "$STATIC_PKGVER" != "" ]]; then
		return 0
	fi

	install_dependencies 1>&2

	# Fetch sources and generate dynamic pkgver
	TEMP_RESOLVE_PKGVER_DIRECTORY="$(mktemp -d -t resolve-dynamic-pkgver-XXXXXXXX)"
	cp -r . "$TEMP_RESOLVE_PKGVER_DIRECTORY"
	pushd "$TEMP_RESOLVE_PKGVER_DIRECTORY" >/dev/null
	echo 'build   () { return 0; }' >> PKGBUILD
	echo 'package () { return 0; }' >> PKGBUILD
	$MAKEPKG_CMD $MAKEPKG_FLAGS 1>&2

	# Resolve dynamic version
	echo "$(source PKGBUILD >/dev/null && srcdir="$(pwd)/src" && pkgver)"

	popd >/dev/null
	rm -rf "$TEMP_RESOLVE_PKGVER_DIRECTORY"
}

# Determine the built package filename (we can't use `basename` here ...)
DYNAMIC_VERSION=$(resolve_dynamic_pkgver)
if [[ "$DYNAMIC_VERSION" != "" ]]; then
	echo "Resolved dynamic version: $DYNAMIC_VERSION"
	echo "pkgver=$DYNAMIC_VERSION" >> PKGBUILD
fi

if [[ "$PACKAGE_TYPE" == "pacman" ]]; then
	PACKAGE_FILES="$(makepkg --packagelist | rev | cut -d'/' -f 1 | rev)"
elif [[ "$PACKAGE_TYPE" == "deb" ]]; then
	PACKAGE_FILES="$(
		source PKGBUILD >/dev/null
		for PACKAGE_NAME in ${pkgname[*]}; do
			echo ${PACKAGE_NAME}_${pkgver}-${pkgrel}_$(dpkg --print-architecture).deb
		done
	)"
fi

echo "::endgroup::"

echo "::group::Determine if the packages are already built"

# Determine if the packages are already built
if [[ "$REPO_URL" != "" ]]; then
	PACKAGE_ALL_BUILT="true"
	for PACKAGE_FILE in $PACKAGE_FILES; do
		PACKAGE_URL="$REPO_URL/$PACKAGE_FILE"

		echo Checking if package exists: $PACKAGE_URL

		CURL_OUTPUT_FILE="/tmp/curl_output.txt"
		curl -I --header 'Cache-Control: no-cache' "$PACKAGE_URL" -w '%{http_code}' | tee "$CURL_OUTPUT_FILE"
		echo # Fix curl's output doesn't end with newline

		HTTP_STATUS="$(cat "$CURL_OUTPUT_FILE" | tail -n 1)"
		if [[ "$HTTP_STATUS" != "200" ]]; then
			PACKAGE_ALL_BUILT="false"
			break
		fi
	done
else
	PACKAGE_ALL_BUILT="false"
fi

echo "::endgroup::"

if [[ "$PACKAGE_ALL_BUILT" == "true" ]]; then
	echo "skipped=$PACKAGE_ALL_BUILT" >> $GITHUB_OUTPUT
	exit 0
fi

echo "::group::Install build dependencies"

# Install dependencies
install_dependencies

echo "::endgroup::"

echo "::group::Build packages"

# Build packages
$MAKEPKG_CMD $MAKEPKG_FLAGS

echo "::endgroup::"

# Set output
echo "skipped=$PACKAGE_ALL_BUILT" >> $GITHUB_OUTPUT

# Copy packages to target directory
sudo cp $PACKAGE_FILES /target/
