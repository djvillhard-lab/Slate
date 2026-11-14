#!/usr/bin/env python3
"""Writes ios/Slate.xcodeproj (project + shared scheme) for the Slate iPhone app.

The app's sources live in ios/Slate/, which the project links as a synchronized folder: any file added there
is part of the app with no project edits. ios/SlateLive/ is the live-notification widget extension (embedded in
the app), and ios/Shared/ is compiled into both. Re-run this only to change build settings:
    python3 ios/tools/gen_project.py
"""
import hashlib, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.join(ROOT, "Slate.xcodeproj")

BUNDLE_ID = "com.djvillhard.slate"
DEPLOY = "17.0"          # the app runs on iOS 17 and later; iPhone Duo needs the iOS 27.1 SDK (Xcode 27.1) to fill its screens
MARKETING = "3.0"
BUILD = "1"


def oid(name):  # stable 24-hex object ids
    return hashlib.sha1(("slate:" + name).encode()).hexdigest()[:24].upper()


P = {k: oid(k) for k in [
    "project", "mainGroup", "productsGroup", "appRef", "syncGroup", "target",
    "sources", "frameworks", "resources", "projList", "targetList",
    "projDebug", "projRelease", "targetDebug", "targetRelease", "entRef", "plistRef",
    # the SlateLive widget extension (live notifications) and the Shared folder both targets compile
    "liveRef", "liveSync", "sharedSync", "liveTarget", "liveSources", "liveFrameworks", "liveResources", "liveList",
    "liveDebug", "liveRelease", "livePlistRef", "embedPhase", "embedFile", "liveDep", "liveProxy"]}


def settings(d, indent="\t\t\t\t"):
    out = []
    for k in sorted(d):
        v = d[k]
        if isinstance(v, list):
            out.append(f"{indent}{k} = (\n" + "".join(f"{indent}\t{q(x)},\n" for x in v) + f"{indent});")
        else:
            out.append(f"{indent}{k} = {q(v)};")
    return "\n".join(out)


def q(v):
    v = str(v)
    if v and all(c.isalnum() or c in "._/" for c in v) and not v[0].isdigit() or v.isdigit():
        return v
    return '"' + v.replace('\\', '\\\\').replace('"', '\\"') + '"'


common = {
    "ALWAYS_SEARCH_USER_PATHS": "NO",
    "CLANG_ENABLE_MODULES": "YES",
    "CLANG_ENABLE_OBJC_ARC": "YES",
    "COPY_PHASE_STRIP": "NO",
    "ENABLE_STRICT_OBJC_MSGSEND": "YES",
    "ENABLE_USER_SCRIPT_SANDBOXING": "YES",
    "GCC_C_LANGUAGE_STANDARD": "gnu17",
    "IPHONEOS_DEPLOYMENT_TARGET": DEPLOY,
    "LOCALIZATION_PREFERS_STRING_CATALOGS": "YES",
    "MTL_FAST_MATH": "YES",
    "SDKROOT": "iphoneos",
    "SWIFT_VERSION": "5.0",
}
proj_debug = dict(common, **{
    "DEBUG_INFORMATION_FORMAT": "dwarf",
    "ENABLE_TESTABILITY": "YES",
    "GCC_OPTIMIZATION_LEVEL": "0",
    "GCC_PREPROCESSOR_DEFINITIONS": ["DEBUG=1", "$(inherited)"],
    "ONLY_ACTIVE_ARCH": "YES",
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG $(inherited)",
    "SWIFT_OPTIMIZATION_LEVEL": "-Onone",
})
proj_release = dict(common, **{
    "DEBUG_INFORMATION_FORMAT": "dwarf-with-dsym",
    "ENABLE_NS_ASSERTIONS": "NO",
    "SWIFT_COMPILATION_MODE": "wholemodule",
    "VALIDATE_PRODUCT": "YES",
})
target_common = {
    "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
    "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
    "CODE_SIGN_ENTITLEMENTS": "Slate.entitlements",
    "CODE_SIGN_STYLE": "Automatic",
    "CURRENT_PROJECT_VERSION": BUILD,
    "DEVELOPMENT_TEAM": "",
    "ENABLE_PREVIEWS": "YES",
    "GENERATE_INFOPLIST_FILE": "YES",
    "INFOPLIST_FILE": "Slate-Info.plist",
    "INFOPLIST_KEY_CFBundleDisplayName": "Slate",
    "INFOPLIST_KEY_LSApplicationCategoryType": "public.app-category.sports",
    "INFOPLIST_KEY_UIApplicationSceneManifest_Generation": "YES",
    "INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents": "YES",
    "INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone": "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight",
    "LD_RUNPATH_SEARCH_PATHS": ["$(inherited)", "@executable_path/Frameworks"],
    "MARKETING_VERSION": MARKETING,
    "PRODUCT_BUNDLE_IDENTIFIER": BUNDLE_ID,
    "PRODUCT_NAME": "$(TARGET_NAME)",
    "SUPPORTED_PLATFORMS": "iphoneos iphonesimulator",
    "SUPPORTS_MACCATALYST": "NO",
    "SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD": "NO",
    "SWIFT_EMIT_LOC_STRINGS": "YES",
    "TARGETED_DEVICE_FAMILY": "1",
}

live_common = {
    "CODE_SIGN_STYLE": "Automatic",
    "CURRENT_PROJECT_VERSION": BUILD,
    "DEVELOPMENT_TEAM": "",
    "GENERATE_INFOPLIST_FILE": "YES",
    "INFOPLIST_FILE": "SlateLive-Info.plist",
    "INFOPLIST_KEY_CFBundleDisplayName": "Slate Live",
    "INFOPLIST_KEY_NSHumanReadableCopyright": "",
    "LD_RUNPATH_SEARCH_PATHS": ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"],
    "MARKETING_VERSION": MARKETING,
    "PRODUCT_BUNDLE_IDENTIFIER": BUNDLE_ID + ".live",
    "PRODUCT_NAME": "$(TARGET_NAME)",
    "SKIP_INSTALL": "YES",
    "SUPPORTED_PLATFORMS": "iphoneos iphonesimulator",
    "SUPPORTS_MACCATALYST": "NO",
    "SWIFT_EMIT_LOC_STRINGS": "YES",
    "TARGETED_DEVICE_FAMILY": "1",
}


def build():
    o = P
    pbx = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 77;
	objects = {{

/* Begin PBXFileReference section */
		{o['appRef']} /* Slate.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Slate.app; sourceTree = BUILT_PRODUCTS_DIR; }};
		{o['entRef']} /* Slate.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = Slate.entitlements; sourceTree = "<group>"; }};
		{o['plistRef']} /* Slate-Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "Slate-Info.plist"; sourceTree = "<group>"; }};
		{o['liveRef']} /* SlateLive.appex */ = {{isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = SlateLive.appex; sourceTree = BUILT_PRODUCTS_DIR; }};
		{o['livePlistRef']} /* SlateLive-Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "SlateLive-Info.plist"; sourceTree = "<group>"; }};
/* End PBXFileReference section */

/* Begin PBXBuildFile section */
		{o['embedFile']} /* SlateLive.appex in Embed Foundation Extensions */ = {{isa = PBXBuildFile; fileRef = {o['liveRef']} /* SlateLive.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};
/* End PBXBuildFile section */

/* Begin PBXContainerItemProxy section */
		{o['liveProxy']} /* PBXContainerItemProxy */ = {{
			isa = PBXContainerItemProxy;
			containerPortal = {o['project']} /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = {o['liveTarget']};
			remoteInfo = SlateLive;
		}};
/* End PBXContainerItemProxy section */

/* Begin PBXCopyFilesBuildPhase section */
		{o['embedPhase']} /* Embed Foundation Extensions */ = {{
			isa = PBXCopyFilesBuildPhase;
			buildActionMask = 2147483647;
			dstPath = "";
			dstSubfolderSpec = 13;
			files = (
				{o['embedFile']} /* SlateLive.appex in Embed Foundation Extensions */,
			);
			name = "Embed Foundation Extensions";
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXCopyFilesBuildPhase section */

/* Begin PBXFileSystemSynchronizedRootGroup section */
		{o['syncGroup']} /* Slate */ = {{
			isa = PBXFileSystemSynchronizedRootGroup;
			path = Slate;
			sourceTree = "<group>";
		}};
		{o['liveSync']} /* SlateLive */ = {{
			isa = PBXFileSystemSynchronizedRootGroup;
			path = SlateLive;
			sourceTree = "<group>";
		}};
		{o['sharedSync']} /* Shared */ = {{
			isa = PBXFileSystemSynchronizedRootGroup;
			path = Shared;
			sourceTree = "<group>";
		}};
/* End PBXFileSystemSynchronizedRootGroup section */

/* Begin PBXFrameworksBuildPhase section */
		{o['frameworks']} /* Frameworks */ = {{
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
		{o['liveFrameworks']} /* Frameworks */ = {{
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		{o['mainGroup']} = {{
			isa = PBXGroup;
			children = (
				{o['syncGroup']} /* Slate */,
				{o['sharedSync']} /* Shared */,
				{o['liveSync']} /* SlateLive */,
				{o['entRef']} /* Slate.entitlements */,
				{o['plistRef']} /* Slate-Info.plist */,
				{o['livePlistRef']} /* SlateLive-Info.plist */,
				{o['productsGroup']} /* Products */,
			);
			sourceTree = "<group>";
		}};
		{o['productsGroup']} /* Products */ = {{
			isa = PBXGroup;
			children = (
				{o['appRef']} /* Slate.app */,
				{o['liveRef']} /* SlateLive.appex */,
			);
			name = Products;
			sourceTree = "<group>";
		}};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		{o['target']} /* Slate */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {o['targetList']} /* Build configuration list for PBXNativeTarget "Slate" */;
			buildPhases = (
				{o['sources']} /* Sources */,
				{o['frameworks']} /* Frameworks */,
				{o['resources']} /* Resources */,
				{o['embedPhase']} /* Embed Foundation Extensions */,
			);
			buildRules = (
			);
			dependencies = (
				{o['liveDep']} /* PBXTargetDependency */,
			);
			fileSystemSynchronizedGroups = (
				{o['syncGroup']} /* Slate */,
				{o['sharedSync']} /* Shared */,
			);
			name = Slate;
			packageProductDependencies = (
			);
			productName = Slate;
			productReference = {o['appRef']} /* Slate.app */;
			productType = "com.apple.product-type.application";
		}};
		{o['liveTarget']} /* SlateLive */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {o['liveList']} /* Build configuration list for PBXNativeTarget "SlateLive" */;
			buildPhases = (
				{o['liveSources']} /* Sources */,
				{o['liveFrameworks']} /* Frameworks */,
				{o['liveResources']} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			fileSystemSynchronizedGroups = (
				{o['liveSync']} /* SlateLive */,
				{o['sharedSync']} /* Shared */,
			);
			name = SlateLive;
			packageProductDependencies = (
			);
			productName = SlateLive;
			productReference = {o['liveRef']} /* SlateLive.appex */;
			productType = "com.apple.product-type.app-extension";
		}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		{o['project']} /* Project object */ = {{
			isa = PBXProject;
			attributes = {{
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 2700;
				LastUpgradeCheck = 2700;
				TargetAttributes = {{
					{o['target']} = {{
						CreatedOnToolsVersion = 27.0;
					}};
					{o['liveTarget']} = {{
						CreatedOnToolsVersion = 27.0;
					}};
				}};
			}};
			buildConfigurationList = {o['projList']} /* Build configuration list for PBXProject "Slate" */;
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = {o['mainGroup']};
			minimizedProjectReferenceProxies = 1;
			preferredProjectObjectVersion = 77;
			productRefGroup = {o['productsGroup']} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				{o['target']} /* Slate */,
				{o['liveTarget']} /* SlateLive */,
			);
		}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		{o['resources']} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
		{o['liveResources']} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		{o['sources']} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
		{o['liveSources']} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXSourcesBuildPhase section */

/* Begin PBXTargetDependency section */
		{o['liveDep']} /* PBXTargetDependency */ = {{
			isa = PBXTargetDependency;
			target = {o['liveTarget']} /* SlateLive */;
			targetProxy = {o['liveProxy']} /* PBXContainerItemProxy */;
		}};
/* End PBXTargetDependency section */

/* Begin XCBuildConfiguration section */
		{o['projDebug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings(proj_debug)}
			}};
			name = Debug;
		}};
		{o['projRelease']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings(proj_release)}
			}};
			name = Release;
		}};
		{o['targetDebug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings(target_common)}
			}};
			name = Debug;
		}};
		{o['targetRelease']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings(target_common)}
			}};
			name = Release;
		}};
		{o['liveDebug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings(live_common)}
			}};
			name = Debug;
		}};
		{o['liveRelease']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings(live_common)}
			}};
			name = Release;
		}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		{o['projList']} /* Build configuration list for PBXProject "Slate" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{o['projDebug']} /* Debug */,
				{o['projRelease']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
		{o['targetList']} /* Build configuration list for PBXNativeTarget "Slate" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{o['targetDebug']} /* Debug */,
				{o['targetRelease']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
		{o['liveList']} /* Build configuration list for PBXNativeTarget "SlateLive" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{o['liveDebug']} /* Debug */,
				{o['liveRelease']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
/* End XCConfigurationList section */
	}};
	rootObject = {o['project']} /* Project object */;
}}
"""
    os.makedirs(os.path.join(PROJ, "xcshareddata", "xcschemes"), exist_ok=True)
    os.makedirs(os.path.join(PROJ, "project.xcworkspace"), exist_ok=True)
    open(os.path.join(PROJ, "project.pbxproj"), "w").write(pbx)
    open(os.path.join(PROJ, "project.xcworkspace", "contents.xcworkspacedata"), "w").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<Workspace\n   version = "1.0">\n   <FileRef\n      location = "self:">\n   </FileRef>\n</Workspace>\n')
    ref = f'''<BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{o['target']}"
               BuildableName = "Slate.app"
               BlueprintName = "Slate"
               ReferencedContainer = "container:Slate.xcodeproj">
            </BuildableReference>'''
    scheme = f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "2700"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            {ref}
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         {ref}
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         {ref}
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
'''
    open(os.path.join(PROJ, "xcshareddata", "xcschemes", "Slate.xcscheme"), "w").write(scheme)
    print("wrote", PROJ)


if __name__ == "__main__":
    build()
