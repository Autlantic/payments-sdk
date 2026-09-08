plugins {
  id("com.android.library")
  id("org.jetbrains.kotlin.android")
  id("com.vanniktech.maven.publish")
}

group = "com.autlantic"
version = property("VERSION_NAME").toString()

android {
  namespace = "com.autlantic.checkout"
  compileSdk = 35

  defaultConfig {
    minSdk = 24
    aarMetadata {
      minCompileSdk = 35
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
  }
}

dependencies {
  implementation("androidx.browser:browser:1.8.0")
  implementation("androidx.activity:activity-ktx:1.9.3")
}

mavenPublishing {
  coordinates("com.autlantic", "checkout", version.toString())

  publishToMavenCentral(com.vanniktech.maven.publish.SonatypeHost.CENTRAL_PORTAL)
  signAllPublications()

  pom {
    name.set("Autlantic Checkout")
    description.set("Official Autlantic Billing mobile Checkout SDK for Android (opens hosted checkoutUrl; no API keys).")
    inceptionYear.set("2026")
    url.set("https://github.com/Autlantic/payments-sdk")
    licenses {
      license {
        name.set("MIT License")
        url.set("https://opensource.org/licenses/MIT")
        distribution.set("repo")
      }
    }
    developers {
      developer {
        id.set("autlantic")
        name.set("Autlantic Limited")
        url.set("https://autlantic.com")
        email.set("support@autlantic.com")
      }
    }
    scm {
      url.set("https://github.com/Autlantic/payments-sdk")
      connection.set("scm:git:git://github.com/Autlantic/payments-sdk.git")
      developerConnection.set("scm:git:ssh://git@github.com/Autlantic/payments-sdk.git")
    }
  }
}
