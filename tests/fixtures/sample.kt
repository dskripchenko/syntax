package app

data class User(val name: String, val age: Int? = null)

fun greet(user: User): String {
    val text = """
        Hello, ${user.name}!
    """.trimIndent()
    return when (user.age) {
        null -> "$text (age unknown)"
        in 0..17 -> text
        else -> text.uppercase()
    }
}
