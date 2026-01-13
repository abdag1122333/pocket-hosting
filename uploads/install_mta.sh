#!/bin/bash

echo "----------------------------------------"
echo "🔧 MTA Server Installer & Utility"
echo "----------------------------------------"

# 1. Download Binaries (Engine)
if [ ! -f "mta-server64" ]; then
    echo "⬇️ Downloading MTA Binaries (Linux x64)..."
    curl -L -o mta.tar.gz https://linux.mtasa.com/dl/multitheftauto_linux_x64.tar.gz
    
    echo "📦 Extracting Binaries..."
    tar -xf mta.tar.gz --strip-components=1
    rm mta.tar.gz
else
    echo "✅ Binaries found."
fi

# 2. Download Base Config
if [ ! -f "mods/deathmatch/mtaserver.conf" ]; then
    echo "⬇️ Downloading Base Configs..."
    curl -L -o config.tar.gz https://linux.mtasa.com/dl/baseconfig.tar.gz
    
    echo "📦 Extracting Configs..."
    # Extract to a temp dir to inspect structure
    mkdir -p temp_config
    tar -xf config.tar.gz -C temp_config
    rm config.tar.gz
    
    # Robustly find the config file
    CONF_FOUND=$(find temp_config -name "mtaserver.conf" | head -n 1)
    
    if [ -z "$CONF_FOUND" ]; then
        echo "❌ Critical Error: mtaserver.conf not found in archive!"
        echo "Dump of extracted files:"
        ls -R temp_config
        exit 1
    fi
    
    echo "✅ Found config at: $CONF_FOUND"
    
    # Determine the root of the config folder (parent of mods/ or the deathmatch folder itself)
    # Usually baseconfig contains: baseconfig/mods/deathmatch/... OR mods/deathmatch/...
    # We want to merge 'mods' folder from temp_config to current directory.
    
    # Check if 'mods' is at top level of temp_config
    if [ -d "temp_config/mods" ]; then
        cp -r temp_config/mods .
    elif [ -d "temp_config/baseconfig/mods" ]; then
        cp -r temp_config/baseconfig/mods .
    else
        # Fallback: Copy parent dir of deathmatch/mtaserver.conf to mods/deathmatch
        CONF_DIR=$(dirname "$CONF_FOUND")
        mkdir -p mods/deathmatch
        cp -r "$CONF_DIR/"* mods/deathmatch/
    fi
    
    rm -rf temp_config
    
    # Final Verification
    if [ ! -f "mods/deathmatch/mtaserver.conf" ]; then
        echo "❌ Install Failed: Could not place mtaserver.conf correctly."
        exit 1
    fi
else
    echo "✅ Configs found."
fi

# 3. Download Default Resources (Vital for server start)
if [ ! -d "mods/deathmatch/resources" ] || [ -z "$(ls -A mods/deathmatch/resources)" ]; then
    echo "⬇️ Downloading Default Resources (Admin, Play, Freeroam)..."
    
    # Clone official resources from GitHub
    # We use a depth of 1 to save space and time
    git clone --depth 1 https://github.com/multitheftauto/mtasa-resources.git temp_resources
    
    # Move them to the correct folder
    mkdir -p mods/deathmatch/resources
    cp -r temp_resources/* mods/deathmatch/resources/
    
    rm -rf temp_resources
    
    echo "✅ Resources Installed (Admin, Play, Freeroam, etc.)"
else
    echo "✅ Resources folder already exists."
fi

# 4. Tunneling (Playit.gg)
if [ ! -f "playit" ]; then
    echo "⬇️ Downloading Playit.gg Tunnel..."
    curl -ssL https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-amd64 -o playit
    chmod +x playit
fi

echo "🔗 Starting Playit.gg Tunnel..."
if [ -f "playit.toml" ]; then
    echo "✅ Found saved Playit config! Restoring connection..."
    # Copy to default location just in case or pass as arg
    # Playit usually looks in /etc/playit/playit.toml or current dir.
    # We will try to run it.
    ./playit --config playit.toml &
else
    echo "⚠️ No saved config found. Creates new tunnel."
    echo "Look for the 'CLAIM URL' below to setup!"
    ./playit &
fi
sleep 5

# 5. Permissions & Run
echo "🚀 Starting MTA Server..."
chmod +x mta-server64
./mta-server64 -n
