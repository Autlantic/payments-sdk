plugins {
    `java-library`
    id("com.vanniktech.maven.publish") version "0.30.0"
}

group = "com.autlantic"
version = property("VERSION_NAME").toString()

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    api("org.json:json:20240303")
    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

mavenPublishing {
    coordinates("com.autlantic", "billing", version.toString())

    publishToMavenCentral(com.vanniktech.maven.publish.SonatypeHost.CENTRAL_PORTAL)
    signAllPublications()

    pom {
        name.set("Autlantic Billing")
        description.set("Official Autlantic Billing server client for Java (subscriptions, payments, payment links, webhook verify).")
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
