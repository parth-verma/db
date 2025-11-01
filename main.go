package main

import (
	"embed"
	"log"
	"log/slog"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	// Initialize the database connection service

	app := application.New(application.Options{
		Name:        "db",
		Description: "A demo of using raw HTML & CSS",
		Logger:      nil,             // nil → default stdout logger
		LogLevel:    slog.LevelDebug, // in dev
		Services:    []application.Service{},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
	})

	dbConnectionService := NewDBConnectionService(app.Logger)

	app.RegisterService(application.NewService(dbConnectionService))

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.

	// Run the application. This blocks until the application has been exited.

	menu := app.NewMenu()

	// Add standard application menu on macOS
	if runtime.GOOS == "darwin" {
		menu.AddRole(application.AppMenu)
	}
	fileMenu := menu.AddSubmenu("File")
	menu.AddRole(application.EditMenu)
	menu.AddRole(application.WindowMenu)
	menu.AddRole(application.HelpMenu)

	fileMenu.Add("New Window").OnClick(func(ctx *application.Context) {
		currentWindow := app.Window.Current()
		if currentWindow != nil && currentWindow.IsFullscreen() {
			app.Window.NewWithOptions(application.WebviewWindowOptions{
				Title: "Database Connections",
				Mac: application.MacWindow{
					InvisibleTitleBarHeight: 50,
					Backdrop:                application.MacBackdropTranslucent,
					TitleBar:                application.MacTitleBarHiddenInset,
				},
				StartState:       application.WindowStateFullscreen,
				Height:           currentWindow.Height(),
				Width:            currentWindow.Width(),
				MinWidth:         600,
				MinHeight:        250,
				BackgroundColour: application.NewRGB(27, 38, 54),
				URL:              "/connections.html",
			})
			return
		}

		window := app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title: "Database Connections",
			Mac: application.MacWindow{
				InvisibleTitleBarHeight: 50,
				Backdrop:                application.MacBackdropTranslucent,
				TitleBar:                application.MacTitleBarHiddenInset,
			},
			MinWidth:         600,
			MinHeight:        250,
			BackgroundColour: application.NewRGB(27, 38, 54),
			URL:              "/connections.html",
		})

		for _, w := range app.Window.GetAll() {
			if w.ID() == window.ID() {
				continue
			}
			if w.IsFullscreen() {
				continue
			}

			if w.IsVisible() && w.IsFocused() {
				windowX, windowY := w.RelativePosition()

				window.SetRelativePosition(windowX+20, windowY+20)
				break
			}

			// windowX, windowY = w.Position()
		}

	})

	fileMenu.AddSeparator()
	if runtime.GOOS == "darwin" {
		fileMenu.AddRole(application.CloseWindow)
	} else {
		fileMenu.AddRole(application.Quit)
	}

	app.Menu.Set(menu)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Database Connections",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		MinWidth:         600,
		MinHeight:        250,
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/connections.html",
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
	// If an error occurred while running the application, log it and exit.
}
