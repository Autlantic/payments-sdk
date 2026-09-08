pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "autlantic-checkout-sample"

include(":app")
include(":autlantic-checkout")
project(":autlantic-checkout").projectDir =
  file("../../../sdks/android/autlantic-checkout")
