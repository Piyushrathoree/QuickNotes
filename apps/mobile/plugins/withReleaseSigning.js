const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') throw new Error('QuickNotes release signing requires the generated Groovy Gradle project.');
    let source = mod.modResults.contents;
    if (source.includes('QUICKNOTES_ANDROID_KEYSTORE')) return mod;
    const signingConfig = `signingConfigs {
        release {
            def releaseStore = System.getenv("QUICKNOTES_ANDROID_KEYSTORE")
            def releaseStorePassword = System.getenv("QUICKNOTES_ANDROID_STORE_PASSWORD")
            def releaseAlias = System.getenv("QUICKNOTES_ANDROID_KEY_ALIAS")
            def releaseKeyPassword = System.getenv("QUICKNOTES_ANDROID_KEY_PASSWORD")
            def hasReleaseSigning = releaseStore && releaseStorePassword && releaseAlias && releaseKeyPassword
            storeFile file(hasReleaseSigning ? releaseStore : 'debug.keystore')
            storePassword hasReleaseSigning ? releaseStorePassword : 'android'
            keyAlias hasReleaseSigning ? releaseAlias : 'androiddebugkey'
            keyPassword hasReleaseSigning ? releaseKeyPassword : 'android'
        }
    }

`;
    const buildTypesOffset = source.indexOf('    buildTypes {');
    if (buildTypesOffset < 0) throw new Error('Could not locate Android buildTypes block for release signing.');
    source = `${source.slice(0, buildTypesOffset)}    ${signingConfig}${source.slice(buildTypesOffset)}`;
    const updatedOffset = source.indexOf('    buildTypes {');
    let buildTypes = source.slice(updatedOffset);
    buildTypes = buildTypes.replace(/(        release \{\n)([\s\S]*?)(\n        \})/, (_match, blockStart, body, blockEnd) => {
      const withoutDebugConfig = body.replace(/^[ \t]*signingConfig signingConfigs\.debug[ \t]*\r?\n/m, '');
      return `${blockStart}            signingConfig signingConfigs.release\n${withoutDebugConfig}${blockEnd}`;
    });
    source = `${source.slice(0, updatedOffset)}${buildTypes}`;
    source += `\n\ngradle.taskGraph.whenReady { taskGraph ->
    def releaseTaskRequested = taskGraph.allTasks.any { it.path.endsWith(':assembleRelease') || it.path.endsWith(':bundleRelease') }
    def releaseSigningValues = ['QUICKNOTES_ANDROID_KEYSTORE', 'QUICKNOTES_ANDROID_STORE_PASSWORD', 'QUICKNOTES_ANDROID_KEY_ALIAS', 'QUICKNOTES_ANDROID_KEY_PASSWORD']
    if (releaseTaskRequested && releaseSigningValues.any { !System.getenv(it) }) {
        throw new GradleException("Set the four QUICKNOTES_ANDROID_* signing environment variables before assembling a release APK.")
    }
}\n`;
    mod.modResults.contents = source;
    return mod;
  });
};
