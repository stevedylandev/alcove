import * as Evolu from "@evolu/common";

/**
 * Formats Evolu Type errors into user-friendly messages.
 *
 * Evolu Type typed errors ensure every error type used in schema must have a
 * formatter. TypeScript enforces this at compile-time, preventing unhandled
 * validation errors from reaching users.
 *
 * The `createFormatTypeError` function handles both built-in and custom errors,
 * and lets us override default formatting for specific errors.
 */
export const formatTypeError = Evolu.createFormatTypeError<
	Evolu.MinLengthError | Evolu.MaxLengthError
>((error): string => {
	switch (error.type) {
		case "MinLength":
			return `Text must be at least ${error.min} character${error.min === 1 ? "" : "s"} long`;
		case "MaxLength":
			return `Text is too long (maximum ${error.max} characters)`;
	}
});
