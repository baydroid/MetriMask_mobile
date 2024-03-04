# Build Guide



Note that all pathnames are given relative to the project directory (apart from those in the Software versions used in this build guide section).

You can find package.json and package-lock.json in the package_etc folder.



### Software versions used in this build guide



#### ANDROID

    System:
        OS: Linux 5.14 Fedora 33 (Workstation Edition) 33 (Workstation Edition)
        CPU: (32) x64 AMD Ryzen 9 3950X 16-Core Processor
        Memory: 103.86 GB / 125.72 GB
        Shell:
            version: 5.0.17
            path: /bin/bash
        Binaries:
        Node:
            version: 20.11.0
            path: ~/.nvm/versions/node/v20.11.0/bin/node
        Yarn:
            version: 1.22.10
            path: /usr/bin/yarn
        npm:
            version: 10.4.0
            path: ~/.nvm/versions/node/v20.11.0/bin/npm
        Watchman:
            version: 2023.10.30.00
            path: /home/linuxbrew/.linuxbrew/bin/watchman
        SDKs:
            Android SDK:
                API Levels:
                    - "33"
                    - "33"
                    - "33"
                    - "34"
                Build Tools:
                    - 30.0.3
                    - 33.0.0
                    - 33.0.1
                    - 33.0.2
                    - 34.0.0
                System Images:
                    - android-33-ext4 | Google Play ARM 64 v8a
                    - android-33-ext4 | Google Play Intel x86_64 Atom
                    - android-33-ext5 | Google Play ARM 64 v8a
                    - android-33-ext5 | Google Play Intel x86_64 Atom
                    - android-33 | Intel x86_64 Atom
                    - android-33 | Google APIs Intel x86_64 Atom
                    - android-34 | Google APIs Intel x86_64 Atom
            Android NDK: Not Found
    IDEs:
        Android Studio: Not Found
    Languages:
        Java:
            version: 17.0.7
            path: /home/me/Android/jbr/bin/javac
        Ruby:
            version: 2.7.3
            path: /usr/bin/ruby
    npmPackages:
        "@react-native-community/cli": Not Found
        react:
            installed: 18.2.0
            wanted: 18.2.0
        react-native:
            installed: 0.73.5
            wanted: 0.73.5
    npmGlobalPackages:
        "*react-native*": Not Found
    Android:
        hermesEnabled: true
        newArchEnabled: false
    iOS:
        hermesEnabled: Not found
        newArchEnabled: false

#### iOS

    *****   iOS BUILD Not Yet Done for this version.   *****

    System:
        OS: macOS 13.2.1
        CPU: (8) arm64 Apple M1
        Memory: 5.90 GB / 16.00 GB
        Shell: 5.8.1 - /bin/zsh
    Binaries:
        Node: 18.10.0 - /opt/homebrew/bin/node
        Yarn: Not Found
        npm: 9.5.0 - /opt/homebrew/bin/npm
        Watchman: 2022.09.26.00 - /opt/homebrew/bin/watchman
    Managers:
        CocoaPods: 1.11.3 - /Users/loma/.gem/ruby/2.7.0/bin/pod
    SDKs:
        iOS SDK:
        Platforms: DriverKit 22.2, iOS 16.2, macOS 13.1, tvOS 16.1, watchOS 9.1
        Android SDK: Not Found
    IDEs:
        Android Studio: Not Found
        Xcode: 14.2/14C18 - /usr/bin/xcodebuild
    Languages:
        Java: Not Found
    npmPackages:
        @react-native-community/cli: Not Found
        react: 18.1.0 => 18.1.0 
        react-native: 0.70.6 => 0.70.6 
        react-native-macos: Not Found
    npmGlobalPackages:
        *react-native*: Not Found



### FIRST STEPS FOR BOTH iOS AND ANDROID



#### STEP 1)

Follow the instructions at the link below to setup the react-native development environment.

    https://reactnative.dev/docs/environment-setup

#### STEP 2)

Create the project, and change to the project directory.

    npx react-native init MetriMask_mobile --template react-native-template-typescript
    cd MetriMask_mobile

To use a specific version of react-native use a project creation command such as

    npx react-native init MetriMask_mobile --version 0.69.1 --template react-native-template-typescript

#### STEP 3)

Copy everything except for the folders build and package_etc from the github into the project directory.

#### STEP 4)

Install the required npm modules. The batch/script files install_modules.bat and install_modules.sh do this automatically on Windows and Unixes.

The tools folder contains a file with just the npm install commands and a Java program to generate install_modules.bat and install_modules.sh from it.

#### STEP 5)

Hack the node modules with this command.

    npx rn-nodeify --hack --install

#### STEP 6)

Follow the instructions here on editing babel.config.js to complete the installation of react-native-reanimated.

    https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/

Also add the plugin @babel/plugin-proposal-private-methods to babel.config.js, with the loose option set to true. Be careful to make sure that react-native-reanimated/plugin comes last in the plugin array. Assuming there aren't any other plugins at the end of the editing babel.config.js should look something like this:

    module.exports = {
      presets: ['module:@react-native/babel-preset'],
      plugins: [["@babel/plugin-proposal-private-methods", { "loose": true }], "react-native-reanimated/plugin"]
    };

#### STEP 7)

Edit index.js, add the following 2 lines at the start of the file.

    import 'react-native-gesture-handler';
    import './shimWrapper.js';

Now change the line 

    import App from './App';

to

    import App from './src/rn/MainView';

#### STEP 8)

Edit node_modules/react-native/Libraries/Lists/FlatList.js.

Find the constructor for class FlatList (currently at line 421 of FlatList.js). The 1st executable line of the constructor should be

    super(props);

Immediately after this line, insert the line

    this.props = props;

With the current version of FlatList.js the start of the constructor should now look something like this:

    constructor(props: Props<ItemT>) {
      super(props);
      this.props = props;
      this._checkProps(this.props);



### SUBSEQUENT STEPS FOR IOS
### IOS BUILD NOT YET DONE FOR THIS VERSION



#### STEP 9i)

Edit node_modules/metrixjs-wallet/node_modules/bitcoinjs-lib/src/hdnode.js. Find function HDNode's definition (currently at line 15):

    function HDNode (keyPair, chainCode) {
      typeforce(types.tuple('ECPair', types.Buffer256bit), arguments)

      if (!keyPair.compressed) throw new TypeError('BIP32 only allows compressed keyPairs')

      this.keyPair = keyPair
      this.chainCode = chainCode
      this.depth = 0
      this.index = 0
      this.parentFingerprint = 0x00000000
    }

Change it by commenting out the typeforce line, so it looks like this:

    function HDNode (keyPair, chainCode) {
      //typeforce(types.tuple('ECPair', types.Buffer256bit), arguments)

      if (!keyPair.compressed) throw new TypeError('BIP32 only allows compressed keyPairs')

      this.keyPair = keyPair
      this.chainCode = chainCode
      this.depth = 0
      this.index = 0
      this.parentFingerprint = 0x00000000
    }

#### STEP 10i)

Edit node_modules/metrixjs-wallet/node_modules/bitcoinjs-lib/src/ecdsa.js. Find function sign's definition (currently at line 77):

    function sign (hash, d) {
      typeforce(types.tuple(types.Hash256bit, types.BigInt), arguments)

      var x = d.toBuffer(32)
      var e = BigInteger.fromBuffer(hash)
      var n = secp256k1.n
      var G = secp256k1.G

      var r, s
      deterministicGenerateK(hash, x, function (k) {
        var Q = G.multiply(k)

        if (secp256k1.isInfinity(Q)) return false

        r = Q.affineX.mod(n)
        if (r.signum() === 0) return false

        s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n)
        if (s.signum() === 0) return false

        return true
      })

      // enforce low S values, see bip62: 'low s values in signatures'
      if (s.compareTo(N_OVER_TWO) > 0) {
        s = n.subtract(s)
      }

      return new ECSignature(r, s)
    }

Change it by commenting out the typeforce line, so it looks like this:

    function sign (hash, d) {
      //typeforce(types.tuple(types.Hash256bit, types.BigInt), arguments)

      var x = d.toBuffer(32)
      var e = BigInteger.fromBuffer(hash)
      var n = secp256k1.n
      var G = secp256k1.G

      var r, s
      deterministicGenerateK(hash, x, function (k) {
        var Q = G.multiply(k)

        if (secp256k1.isInfinity(Q)) return false

        r = Q.affineX.mod(n)
        if (r.signum() === 0) return false

        s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n)
        if (s.signum() === 0) return false

        return true
      })

      // enforce low S values, see bip62: 'low s values in signatures'
      if (s.compareTo(N_OVER_TWO) > 0) {
        s = n.subtract(s)
      }

      return new ECSignature(r, s)
    }

#### STEP 11i)

Edit node_modules/metrixjs-wallet/node_modules/bitcoinjs-lib/src/ecsignature.js. Find function ECSignature's definition (currently at line 7):

    function ECSignature (r, s) {
      typeforce(types.tuple(types.BigInt, types.BigInt), arguments)

      this.r = r
      this.s = s
    }

Change it by commenting out the typeforce line, so it looks like this:

    function ECSignature (r, s) {
      //typeforce(types.tuple(types.BigInt, types.BigInt), arguments)

      this.r = r
      this.s = s
    }

#### STEP 12i)

The pod install command won't work unless the project's a git repository. So, if it's not already a git repo then make it so. For example, with these commands

    git init
    git add --all
    git commit -m "initial commit"

#### STEP 13i)

Following the instructions here

    https://www.npmjs.com/package/react-native-permissions

edit ios/Podfile to add the camera permission. You will have to add the lines

    permissions_path = '../node_modules/react-native-permissions/ios'
    pod 'Permission-Camera', :path => "#{permissions_path}/Camera"

to the target 'MetriMask_mobile' do ... end section, like so

    target 'MetriMask_mobile' do

        # Other stuff in the Podfile.

        permissions_path = '../node_modules/react-native-permissions/ios'
        pod 'Permission-Camera', :path => "#{permissions_path}/Camera"

    end

#### STEP 14i)

Run pod install in the ios directory.

    cd ios
    pod install
    cd ..

#### STEP 15i)

Add the Ios icons by copying the contents of Images.xcassets to ios/MetriMask_mobile/Images.xcassets, overwriting Contents.json.

    cp -r Images.xcassets/* ios/MetriMask_mobile/Images.xcassets

#### STEP 16i)

Edit ios/MetriMask_mobile/Info.plist, add the following 3 key value pairs to it in the dict section.

    <key>LSApplicationQueriesSchemes</key>
    <array>
        <string>http</string>
        <string>https</string>
    </array>
    <key>NSCameraUsageDescription</key>
    <string>MetriMask uses the camera to scan QR codes.</string>
    <key>UIAppFonts</key>
    <array>
        <string>AntDesign.ttf</string>
        <string>Entypo.ttf</string>
        <string>EvilIcons.ttf</string>
        <string>Feather.ttf</string>
        <string>FontAwesome.ttf</string>
        <string>FontAwesome5_Brands.ttf</string>
        <string>FontAwesome5_Regular.ttf</string>
        <string>FontAwesome5_Solid.ttf</string>
        <string>Foundation.ttf</string>
        <string>Ionicons.ttf</string>
        <string>MaterialIcons.ttf</string>
        <string>MaterialCommunityIcons.ttf</string>
        <string>SimpleLineIcons.ttf</string>
        <string>Octicons.ttf</string>
        <string>Zocial.ttf</string>
    </array>

If there's an existing UIAppFonts section amalgamate the fonts from it and the UIAppFonts section above to make a single UIAppFonts section. If there's an existing LSApplicationQueriesSchemes section amalgamate the strings from it and the LSApplicationQueriesSchemes section above to make a single LSApplicationQueriesSchemes section. If there's an existing NSCameraUsageDescription section overwrite it. Afterwards Info.plist should look something like this

    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>

        <!-- Other stuff -->

        <key>LSApplicationQueriesSchemes</key>
        <array>
            <string>http</string>
            <string>https</string>
        </array>
        <key>NSCameraUsageDescription</key>
        <string>MetriMask uses the camera to scan QR codes.</string>
        <key>UIAppFonts</key>
        <array>
            <string>AntDesign.ttf</string>
            <string>Entypo.ttf</string>
            <string>EvilIcons.ttf</string>
            <string>Feather.ttf</string>
            <string>FontAwesome.ttf</string>
            <string>FontAwesome5_Brands.ttf</string>
            <string>FontAwesome5_Regular.ttf</string>
            <string>FontAwesome5_Solid.ttf</string>
            <string>Foundation.ttf</string>
            <string>Ionicons.ttf</string>
            <string>MaterialIcons.ttf</string>
            <string>MaterialCommunityIcons.ttf</string>
            <string>SimpleLineIcons.ttf</string>
            <string>Octicons.ttf</string>
            <string>Zocial.ttf</string>
        </array>

        <!-- Other stuff -->

    </dict>
    </plist>

#### STEP 17i)

Open the project in Xcode. To do this start Xcode, and select Open a project or file. Open the ios folder, do not open the file ios/MetriMask_mobile.xcodeproj. Wait until Xcode finishes analyzing the project before moving on.

Click on Xcode's top bar icon of a microwave oven with the controls on the left to open its left side vertical panel. Click on the folder icon at the left of the icon row at the top of this panel. Click on MetriMask_mobile in the left panel. From TARGETS at the left of the middle panel click on MetriMask_mobile.

Click on the General tab.

Under Supported Destinations adjust the list to only iPhone and iPad.

Under Identity update Display Name to MetriMask.

Under Deployment Info/Orientation make sure only portrait is selected for both iPhone and iPad.

Click on the Info tab.

Verify that the Privacy - Camera Usage Description, the Queried URL Schemes, and the Fonts provided by application keys are present. If they aren't edit Info.plist again.

Now click on Pods in Xcode's left side panel.

From the vertical list of pods at the left of Xcode's middle panel click on TcpSockets to select the TcpSockets pod. Click on the Build Phases tab of the middle panel, and expand the Compile Sources list. Remove GCDAsyncSocket.m from the list.

Do the same for the react-native-udp pod.

Note that Xcode may sneak these compile sources back in again if you change any project dependencies. If the build fails with a duplicate symbol linker error check to see if GCDAsyncSocket.m has come back, and, if so, remove it again.

#### STEP 18i)

In a 2nd terminal window change to the project directory, and start Metro with this command

    npx react-native start --reset-cache

#### STEP 19i)

From the terminal window not running Metro in the project directory build and run the debug version of the app with this command.

    npx react-native run-ios

To build and run the release version instead use this command

    npx react-native run-ios --configuration=Release



### SUBSEQUENT STEPS FOR ANDROID

#### STEP 9a)

Edit android/app/src/main/res/values/strings.xml. Set the android app name by setting the value of the "app_name" string. Leave any other strings intact.

Change

    <resources>
        <string name="app_name">MetriMask_mobile</string>
    </resources>

to

    <resources>
        <string name="app_name">MetriMask</string>
    </resources>

#### STEP 10a)

Edit android/app/build.gradle and add the

    missingDimensionStrategy 'react-native-camera', 'general'
    
line to the existing android.defaultConfig section already in the file. I.E. placed like so.

    android {
        defaultConfig {
            missingDimensionStrategy 'react-native-camera', 'general'
        }
    }

Next, add the following line at the end of android/app/build.gradle (not inside any section or { } curly braces).

    apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"

#### STEP 11a)

Edit android/app/src/main/AndroidManifest.xml.

Add the lines

    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />

to the

    <manifest>
tag.

Add android:exported="true" and android:screenOrientation="portrait" to the properties of the &lt;activity> tag.

Afterwards the additions should be placed like this:

    <manifest>
        <uses-permission android:name="android.permission.VIBRATE" />
        <uses-permission android:name="android.permission.CAMERA" />
        <application
            <activity
                android:screenOrientation="portrait"
                android:exported="true">
            </activity>
        </application>
    </manifest>

Add the intent filter

    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" />
        <data android:scheme="http" />
    </intent-filter>

to android/app/src/main/AndroidManifest.xml, immediately after the existing intent filter.

#### STEP 12a)
    
Edit node_modules/react-native-os/android/build.gradle, change

    dependencies {
        compile 'com.facebook.react:react-native:+'
    }

to

    dependencies {
        implementation 'com.facebook.react:react-native:+'
    }

#### STEP 13a)

Edit node_modules/react-native-tcp/android/build.gradle, change

    dependencies {
        compile 'com.facebook.react:react-native:+'
        compile 'com.koushikdutta.async:androidasync:2.1.6'
    }

to

    dependencies {
        implementation 'com.facebook.react:react-native:+'
        implementation 'com.koushikdutta.async:androidasync:2.1.6'
    }

#### STEP 14a)

Provide the icons by copying the res folder to android/app/src/main, overwriting 10 PNG icon files.

    cp -rv res/* android/app/src/main/res

#### STEP 15a)

In a 2nd terminal window change to the project directory, and start Metro with this command

    npx react-native start --reset-cache

#### STEP 16a)

Activate developer mode on an android, enable USB debugging, and connect it to the computer. (You can actually skip this step and it will still build, but the build will complete with an emulator not found error).

#### STEP 17a)

From the terminal window not running Metro in the project directory build and run the debug version of the app with this command.

    npx react-native run-android

To build and run the release verion instead use this command

    npx react-native run-android --mode=release

Afterwards the APKs can be found in

    android/app/build/outputs/apk
