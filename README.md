# Build Guide

Note that all pathnames are given relative to the project directory (apart from those in the Software versions used in this build guide section).

Also note that package.json and package-lock.json come from the Android project (not the iOS 1).



### Software versions used in this build guide

#### ANDROID

    System:
        OS: Linux 5.14 Fedora 33 (Workstation Edition) 33 (Workstation Edition)
        CPU: (32) x64 AMD Ryzen 9 3950X 16-Core Processor
        Memory: 94.30 GB / 125.72 GB
        Shell: 5.0.17 - /bin/bash
    Binaries:
        Node: 16.13.2 - ~/.nvm/versions/node/v16.13.2/bin/node
        Yarn: 1.22.17 - ~/.nvm/versions/node/v16.13.2/bin/yarn
        npm: 8.1.2 - ~/.nvm/versions/node/v16.13.2/bin/npm
        Watchman: 2022.01.03.00 - /home/linuxbrew/.linuxbrew/bin/watchman
    SDKs:
        Android SDK: 31
    IDEs:
        Android Studio: Android Studio Chipmunk | 2021.2.1 Patch 1 (Gradle 7.5.1)
    Languages:
        Java: Android Studio embedded JDK 11.0.12
    npmPackages:
        @react-native-community/cli: Not Found
        react: 18.1.0 => 18.1.0 
        react-native: 0.70.6 => 0.70.6 
    npmGlobalPackages:
        *react-native*: Not Found

For some reason npx react-native info couldn't find Android Studio, or the SDK, or the JDK. So I filled in those bits by hand.

#### iOS

    System:
        OS: macOS 12.6
        CPU: (8) arm64 Apple M1
        Memory: 4.45 GB / 16.00 GB
        Shell: 5.8.1 - /bin/zsh
    Binaries:
        Node: 18.10.0 - /opt/homebrew/bin/node
        Yarn: Not Found
        npm: 9.1.1 - /opt/homebrew/bin/npm
        Watchman: 2022.09.26.00 - /opt/homebrew/bin/watchman
    Managers:
        CocoaPods: 1.11.3 - /Users/loma/.gem/ruby/2.7.0/bin/pod
    SDKs:
        iOS SDK:
        Platforms: DriverKit 22.1, iOS 16.1, macOS 13.0, tvOS 16.1, watchOS 9.1
        Android SDK: Not Found
    IDEs:
        Android Studio: Not Found
        Xcode: 14.1/14B47b - /usr/bin/xcodebuild
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

Copy everything except for the folders build and package_lock_etc from the github into the project directory.

#### STEP 4)

Install the required npm modules. The batch/script files install_modules.bat and install_modules.sh do this automatically on Windows and Unixes.

The tools folder contains a file with just the npm install commands and a Java program to generate install_modules.bat and install_modules.sh from it.

#### STEP 5)

Hack the node modules with this command.

    npx rn-nodeify --hack --install

#### STEP 6)

Follow the instructions here

    https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/

to complete the installation of react-native-reanimated. The project does use proguard, so android/app/proguard-rules.pro must be edited, as well as babel.config.js.

#### STEP 7)

Edit index.js, add the following 2 lines at the start of the file.

    import 'react-native-gesture-handler';
    import './shimWrapper.js';

Now change the line 

    import App from './App';

to

    import App from './src/rn/MainView';



#### SUBSEQUENT STEPS FOR IOS

#### STEP 8i)

The pod install command won't work unless the porject's a git repository. So, if it's not already a git repo then make it so. For example, with these commands

    git init
    git add --all
    git commit -m "initial commit"

#### STEP 9i)

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

#### STEP 10i)

Run pod install in the ios directory.

    cd ios
    pod install
    cd ..

#### STEP 11i)

Add the Ios icons by copying the contents of Images.xcassets to ios/MetriMask_mobile/Images.xcassets, overwriting Contents.json.

    cp -r Images.xcassets/* ios/MetriMask_mobile/Images.xcassets

#### STEP 12i)

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

#### STEP 13i)

Open the project in Xcode (I.E. open ios/MetriMask_mobile.xcodeproj).

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

#### STEP 14i)

In a 2nd terminal window change to the project directory, and start Metro with this command

    npx react-native start --reset-cache

#### STEP 15i)

From the terminal window not running Metro in the project directiory build and run the debug version of the app with this command.

    npx react-native run-ios

To build and run the release verion instead use this command

    npx react-native run-ios --configuration=Release



#### SUBSEQUENT STEPS FOR ANDROID

#### STEP 8a)

Edit android/build.gradle. Add the line

    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.6.0')

to the esisting buildscript.dependencies section already in the file (just above where the comments say not to add dependancies). I.E. placed like so.

    buildscript {
        dependencies {
            classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.6.0')
        }
    }
    
#### STEP 9a)

Edit android/app/build.gradle and, if necessary, change enableHermes: false to enableHermes: true in the existing project.ext.react section in the file. Afterwards it should look similar to this.
    
    project.ext.react = [
        enableHermes: true,  // clean and rebuild if changing
    ]

Now add the

    missingDimensionStrategy 'react-native-camera', 'general'
    
line to the existing android.defaultConfig section already in the file. I.E. placed like so.

    android {
        defaultConfig {
            missingDimensionStrategy 'react-native-camera', 'general'
        }
    }

Next, add the following line at the end of android/app/build.gradle (not inside any section or { } curly braces).

    apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"

#### STEP 10a)

Edit android/app/src/main/AndroidManifest.xml.

Add the lines

    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />

to the

    <manifest>
tag.

Add android:exported="true" and android:screenOrientation="portrait" to the properties of the <activity> tag.

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

to android/app/src/main/AndroidManifest.xml, imediately after the existing intent filter.

#### STEP 11a)
    
Edit node_modules/react-native-os/android/build.gradle, change

    dependencies {
        compile 'com.facebook.react:react-native:+'
    }

to

    dependencies {
        implementation 'com.facebook.react:react-native:+'
    }

#### STEP 12a)

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

#### STEP 13a)

Edit android/app/src/main/res/values/strings.xml. Set the android app name by setting the value of the "app_name" string. Leave any other strings intact.

Change

    <resources>
        <string name="app_name">MetriMask_mobile</string>
    </resources>

to

    <resources>
        <string name="app_name">MetriMask</string>
    </resources>

#### STEP 14a)

comment out the @Override at line 33 of node_modules/react-native-udp/android/src/main/java/com/tradle/react/UdpSocketsModule.java. Thus

    @Override
    public List<Class<? extends JavaScriptModule>> createJSModules() {

becomes

    //@Override
    public List<Class<? extends JavaScriptModule>> createJSModules() {

#### STEP 15a)

Provide the icons by copying the res folder to android/app/src/main, overwriting 10 PNG icon files.

    cp -r res/* android/app/src/main/res

#### STEP 16a)

In a 2nd terminal window change to the project directory, and start Metro with this command

    npx react-native start --reset-cache

#### STEP 17a)

Activate developer mode on an android, enable USB debuging, and connect it to the computer. (You can actually skip this #### STEP and it will still build, but the build will complete with an emulator not found error).

#### STEP 18a)

From the terminal window not running Metro in the project directiory build and run the debug version of the app with this command.

    npx react-native run-android

To build and run the release verion instead use this command

    npx react-native run-android --variant=release

Afterwards the APKs can be found in

    android/app/build/outputs/apk
