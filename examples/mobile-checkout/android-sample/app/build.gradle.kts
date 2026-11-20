plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.autlantic.checkout.sample"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.autlantic.checkout.sample"
    minSdk = 24
    targetSdk = 35
    versionCode = 1
    versionName = "0.1.0"
    val backend =
      (System.getenv("AUTLANTIC_SAMPLE_BACKEND") ?: "http://10.0.2.2:3055").replace("\"", "")
    buildConfigField("String", "AUTLANTIC_SAMPLE_BACKEND", "\"$backend\"")
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
  }
  buildFeatures {
    viewBinding = false
    buildConfig = true
  }
}

dependencies {
  implementation(project(":autlantic-checkout"))
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")
  implementation("androidx.activity:activity-ktx:1.9.3")
}
