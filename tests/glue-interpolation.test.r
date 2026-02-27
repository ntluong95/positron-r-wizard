# Manual visual verification file for glue interpolation highlighting.
# Open this file in Positron/VS Code and place cursor in each string.

library(glue)
library(stringr)

name <- "World"
df <- data.frame(x = 1:3, y = 4:6)
active <- TRUE
score <- 98.234
user_name <- "alice"

# Unqualified glue()
greeting <- glue("Hello, {name}!")
glue("The mean of x is {mean(df$x)} and the sum of y is {sum(df$y)}.")

# Multi-line glue string with control-flow expression
glue(
  "User: {user_name}
   Score: {round(score, 2)}
   Status: {if (active) 'active' else 'inactive'}"
)

# Escaped braces should remain plain string content, not interpolation
glue("Literal braces: {{name}} and value: {name}")

# Namespace-qualified glue::glue()
glue::glue("Namespace call: {toupper(name)}")

# stringr unqualified and namespace-qualified
str_glue("Hello {name}")
str_glue_data(df, "Row: {x} and {y}")
stringr::str_glue("Again: {name}")
stringr::str_glue_data(df, "Row ns: {x}, {y}")

# Nested function calls inside interpolation
glue("Nested: {paste0(toupper(substr(name, 1, 1)), tolower(substr(name, 2, nchar(name))))}")

# Both quote styles for strings are supported
glue('single quote interpolation: {name}')

# Pipe context should still highlight interpolation only inside glue strings
df |>
  transform(label = glue("x={x}, y={y}")) |>
  transform(label2 = str_glue("{label} :: {toupper(name)}"))
