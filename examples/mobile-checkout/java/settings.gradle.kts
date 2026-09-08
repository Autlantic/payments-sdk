rootProject.name = "autlantic-mobile-checkout-java"

includeBuild("../../../sdks/java") {
    dependencySubstitution {
        substitute(module("com.autlantic:billing")).using(project(":"))
    }
}
