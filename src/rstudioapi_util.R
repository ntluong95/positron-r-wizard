update_addin_registry <- function(addin_registry) {
    pkgs <- .packages(all.available = TRUE)
    addin_files <- vapply(
        pkgs,
        function(pkg) {
            system.file("rstudio/addins.dcf", package = pkg)
        },
        character(1L)
    )
    addin_files <- addin_files[file.exists(addin_files)]
    addin_descriptions <-
        mapply(
            function(package, package_dcf) {
                addin_description_names <-
                    c(
                        "name",
                        "description",
                        "binding",
                        "interactive",
                        "package"
                    )
                description_result <-
                    tryCatch(
                        {
                            addin_description <-
                                as.data.frame(
                                    read.dcf(package_dcf),
                                    stringsAsFactors = FALSE
                                )

                            if (ncol(addin_description) < 4) {
                                NULL
                            }
                            ## if less than 4 columns it's malformed
                            ## a NULL will be ignored in the rbind

                            addin_description$package <- package
                            names(addin_description) <- addin_description_names

                            addin_description[, addin_description_names]
                            ## this filters out any extra columns
                        },
                        error = function(cond) {
                            message(
                                "addins.dcf file for ",
                                package,
                                " could not be read from R library. ",
                                "The R addin picker will not ",
                                "contain it's addins"
                            )

                            NULL
                        }
                    )

                description_result
            },
            names(addin_files),
            addin_files,
            SIMPLIFY = FALSE
        )
    addin_descriptions_flat <-
        do.call(
            function(...) rbind(..., make.row.names = FALSE),
            addin_descriptions
        )

    jsonlite::write_json(addin_descriptions_flat, addin_registry, pretty = TRUE)
}
