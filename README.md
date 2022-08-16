# Build Guide

Note that all pathnames are given relative to the project directory.

Software versions used in this build guide:

    Android Studio: Chipmunk 2021.2.1 Patch 1
    JDK: Using Android studio default JDK (version 11.0.12, supplied with android studio)
    Node.js: version 16.13.2
    React Native: version 0.69.1
    Watchman: version 2022.01.03.00

STEP 1)

Follow the instructions at the link below to setup the react-native development environment.

    https://reactnative.dev/docs/environment-setup

STEP 2)

Create the project, and change to the project directory.

    npx react-native init MetriMask_mobile --template react-native-template-typescript
    cd MetriMask_mobile

To use a specific version of react-native use a project creation command such as

    npx react-native init MetriMask_mobile --version 0.69.1 --template react-native-template-typescript

STEP 3)

Copy the src directory and the README.md from the github into the project directory.

STEP 4)

Install the required npm modules.

    npm install big-integer
    npm install base58-js
    npm install sha256-uint8array
    npm install bip39
    npm install bech32
    npm install mweb3
    npm install metrixjs-wallet
    npm install bitcoinjs-message
    npm install bitcoinjs-lib@4.0.5
    npm install --save-dev @types/bitcoinjs-lib
    npm install scryptsy
    npm install --save-dev @types/scryptsy
    npm install keccak
    npm install --save-dev @types/keccak
    npm install lodash
    npm install --save-dev @types/lodash
    npm install react-native-exception-handler
    npm install react-native-safe-area-context
    npm install react-native-gesture-handler
    npm install react-native-permissions
    npm install react-native-svg
    npm install react-native-reanimated
    npm install deprecated-react-native-prop-types
    npm install react-native-screens
    npm install react-native-webview
    npm install react-native-paper
    npm install @react-native-cookies/cookies
    npm install @react-navigation/native
    npm install @react-navigation/bottom-tabs
    npm install @react-navigation/stack
    npm install @react-navigation/drawer
    npm install react-native-camera
    npm install react-native-qrcode-scanner
    npm install react-native-vector-icons
    npm install @react-native-async-storage/async-storage
    npm install react-native-crypto
    npm install react-native-randombytes
    npm install react-native-responsive-dimensions
    npm install react-native-user-inactivity --legacy-peer-deps
    npm install @react-native-clipboard/clipboard
    npm install react-native-dropdown-picker
    npm install react-native-pager-view
    npm install react-native-tab-view
    npm install react-native-qrcode-svg
    npm install --save-dev tradle/rn-nodeify

STEP 5)

Hack the node modules with this command.

    ./node_modules/.bin/rn-nodeify --hack --install

STEP 6)

Follow the instructions here

    https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/

to complete the installation of react-native-reanimated. The project does use proguard, so android/app/proguard-rules.pro must be edited, as well as babel.config.js.

STEP 7)

Edit android/build.gradle. Add the line

    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.6.0')

to the esisting buildscript.dependencies section already in the file. I.E. placed like so.

    buildscript {
        dependencies {
            classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.6.0')
        }
    }

STEP 8)

Edit shim.js, at the end of the file uncomment the line

    require('crypto')

STEP 9)

Edit index.js, add the following 2 lines at the start of the file.

    import 'react-native-gesture-handler';
    import './shim.js';

Now change the line 

    import App from './App';

to

    import App from './src/rn/MainView';
    
STEP 10)

Edit android/app/build.gradle, change enableHermes: false to enableHermes: true in the existing project.ext.react section in the file. Afterwards it should look similar to this.
    
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

STEP 11)

Edit android/app/src/main/AndroidManifest.xml.

Add the line <uses-permission android:name="android.permission.VIBRATE" /> to the <manifest> tag.

Add android:exported="true" and android:screenOrientation="portrait" to the properties of the <activity> tag.

Afterwards the additions should be placed like this:

    <manifest>
        <uses-permission android:name="android.permission.VIBRATE" />
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

STEP 12)
    
Edit node_modules/react-native-os/android/build.gradle, change

    dependencies {
        compile 'com.facebook.react:react-native:+'
    }

to

    dependencies {
        implementation 'com.facebook.react:react-native:+'
    }

STEP 13)

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

STEP 14)

Edit android/app/src/main/res/values/strings.xml. Set the android app name by setting the value of the "app_nmae" string. Leave any other strings intact.

For example change

    <resources>
        <string name="app_name">MetriMask_mobile</string>
    </resources>

to

    <resources>
        <string name="app_name">MetriMask</string>
    </resources>

STEP 15)
    
Edit node_modules/react-native-camera/src/RNCamera.js. Change importing ViewPropTypes from react-native to importing ViewPropTypes from deprecated-react-native-prop-types. I.E. change the start of the file from

    // @flow
    import React from 'react';
    import PropTypes from 'prop-types';
    import {
    findNodeHandle,
    Platform,
    NativeModules,
    ViewPropTypes,
    requireNativeComponent,
    View,
    ActivityIndicator,
    Text,
    StyleSheet,
    PermissionsAndroid,
    } from 'react-native';

to

    // @flow
    import React from 'react';
    import PropTypes from 'prop-types';
    import {
    findNodeHandle,
    Platform,
    NativeModules,
    //  ViewPropTypes,
    requireNativeComponent,
    View,
    ActivityIndicator,
    Text,
    StyleSheet,
    PermissionsAndroid,
    } from 'react-native';
    import { ViewPropTypes } from 'deprecated-react-native-prop-types';

STEP 16)

In a 2nd terminal window change to the project directory, and start Metro with this command

    npx react-native start --reset-cache

STEP 17)

Activate developer mode on an android, enable USB debuging, and connect it to the computer. (You can actually skip this step and it will still build, but the build will complete with an emulator not found error).

STEP 18)

From the terminal window not running Metro in the project directiory build and run the debug version of the app with this command.

    npx react-native run-android

To build and run the release verion instead use this command

    npx react-native run-android --variant=release

Afterwards the APKs can be found in

    android/app/build/outputs/apk
