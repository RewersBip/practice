package main

import (
	"database/sql"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var db *sql.DB

var tmplIndex = template.Must(template.ParseFiles("templates/index.html"))
var tmplGallery = template.Must(template.ParseFiles("templates/Gallery.html"))
var tmplGroup = template.Must(template.ParseFiles("templates/Group.html"))
var tmplProgress = template.Must(template.ParseFiles("templates/Progress.html"))
var tmplProfile = template.Must(template.ParseFiles("templates/profile.html"))

type User struct {
	Id_user  int    `db:"user_id"`
	Username string `db:"username"`
	Email    string `db:"email"`
	Password string `db:"password1"`
}

type UserContext struct {
	Username   string
	Email      string
	IsLoggedIn bool
}

func main() {
	var err error
	db, err = InitDb()
	if err != nil {
		log.Fatal("Критическая ошибка подключения к БД: ", err)
	}
	defer db.Close()

	http.HandleFunc("/", HomeHandler)
	http.HandleFunc("/gallery", GalleryHandler)
	http.HandleFunc("/group", GroupHandler)
	http.HandleFunc("/progress", ProgressHandler)
	http.HandleFunc("/profile", ProfileHandler)

	http.HandleFunc("/register", PostRegisterHandler)
	http.HandleFunc("/login", PostLoginPageHandler)
	http.HandleFunc("/logout", LogoutHandler)

	http.HandleFunc("/static/", CustomStaticServer)

	log.Println("Сервер успешно запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func InitDb() (*sql.DB, error) {
	PsqlInfo := "host=127.0.0.1 port=5432 user=postgres password=rewers2323 dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", PsqlInfo)
	if err != nil {
		return nil, err
	}
	if err = db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

func getUserContext(r *http.Request) UserContext {
	cookie, err := r.Cookie("iduser")
	if err != nil {
		return UserContext{IsLoggedIn: false}
	}
	iduser, _ := strconv.Atoi(cookie.Value)

	var U User
	err = db.QueryRow(`SELECT user_id, username, email FROM users WHERE user_id = $1`, iduser).Scan(&U.Id_user, &U.Username, &U.Email)
	if err != nil {
		return UserContext{IsLoggedIn: false}
	}
	return UserContext{
		Username:   U.Username,
		Email:      U.Email,
		IsLoggedIn: true,
	}
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	ctx := getUserContext(r)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmplIndex.Execute(w, ctx)
}

func GalleryHandler(w http.ResponseWriter, r *http.Request) {
	ctx := getUserContext(r)
	tmplGallery.Execute(w, ctx)
}

func GroupHandler(w http.ResponseWriter, r *http.Request) {
	ctx := getUserContext(r)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmplGroup.Execute(w, ctx)
}

func ProgressHandler(w http.ResponseWriter, r *http.Request) {
	ctx := getUserContext(r)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmplProgress.Execute(w, ctx)
}

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	ctx := getUserContext(r)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmplProfile.Execute(w, ctx)
}

func PostRegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Redirect(w, r, "/profile", http.StatusSeeOther)
		return
	}

	username := strings.TrimSpace(r.FormValue("username"))
	email := strings.TrimSpace(r.FormValue("Email"))
	password := r.FormValue("passworduser")

	if username == "" || email == "" || password == "" {
		http.Error(w, "Все поля обязательны для заполнения", http.StatusBadRequest)
		return
	}

	if len(password) < 4 {
		http.Error(w, "Пароль слишком короткий (минимум 4 символа)", http.StatusBadRequest)
		return
	}

	var newID int
	err := db.QueryRow(`INSERT INTO users (username, email, password1) VALUES ($1, $2, $3) RETURNING user_id`, username, email, password).Scan(&newID)
	if err != nil {
		http.Error(w, "Ошибка регистрации. Данный логин или Email заняты.", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{Name: "iduser", Value: strconv.Itoa(newID), Path: "/"})
	http.Redirect(w, r, "/profile", http.StatusSeeOther)
}

func PostLoginPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Redirect(w, r, "/profile", http.StatusSeeOther)
		return
	}

	username := strings.TrimSpace(r.FormValue("username"))
	password := r.FormValue("passworduser")

	if username == "" || password == "" {
		http.Error(w, "Введите логин и пароль", http.StatusBadRequest)
		return
	}

	var dbPassword string
	var iduser int
	err := db.QueryRow(`SELECT user_id, password1 FROM users WHERE username = $1`, username).Scan(&iduser, &dbPassword)

	if err == nil && dbPassword == password {
		http.SetCookie(w, &http.Cookie{Name: "iduser", Value: strconv.Itoa(iduser), Path: "/"})
		http.Redirect(w, r, "/profile", http.StatusSeeOther)
		return
	}
	http.Error(w, "Неверный логин или пароль", http.StatusUnauthorized)
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:   "iduser",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func CustomStaticServer(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Path[len("/static/"):]
	ext := strings.ToLower(filepath.Ext(filePath))

	if ext == ".css" {
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	} else if ext == ".js" {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	} else if ext == ".jpg" || ext == ".jpeg" {
		w.Header().Set("Content-Type", "image/jpeg")
	} else if ext == ".png" {
		w.Header().Set("Content-Type", "image/png")
	}

	targets := []string{
		filePath,
		filepath.Join("css", filePath),
		filepath.Join("png", filePath),
		filepath.Join("templates", filePath),
		filepath.Join("html", filePath),
	}

	for _, path := range targets {
		if _, err := os.Stat(path); err == nil {
			http.ServeFile(w, r, path)
			return
		}
	}

	log.Println("Статический файл не найден:", filePath)
	http.NotFound(w, r)
}
