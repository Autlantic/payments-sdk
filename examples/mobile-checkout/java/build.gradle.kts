plugins {
    application
}

group = "com.autlantic.sample"
version = "0.1.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.autlantic:billing:0.1.0")
    implementation("org.json:json:20240303")
}

application {
    mainClass.set("com.autlantic.billing.sample.SampleServer")
}
