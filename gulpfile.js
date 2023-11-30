const { src, dest, watch, series, parallel } = require("gulp");

const sass = require("gulp-sass")(require("sass"));
const notify = require("gulp-notify");
const sourcemap = require("gulp-sourcemaps");
const autoprefixer = require("gulp-autoprefixer");
const concat = require("gulp-concat");
const rename = require("gulp-rename");
const cleanCss = require("gulp-clean-css");
const browserSync = require("browser-sync").create();
const fileinclude = require("gulp-file-include");
const svgSprite = require("gulp-svg-sprite");
const ttf2woff = require("gulp-ttf2woff");
const ttf2woff2 = require("gulp-ttf2woff2");
const fs = require("fs");
const del = require("del");
const webpack = require("webpack");
const webpackStream = require("webpack-stream");
const uglify = require("gulp-uglify-es").default;
const image = require("gulp-image");
const gutil = require("gulp-util");
const ftp = require("vinyl-ftp");
const htmlmin = require("gulp-htmlmin")
const webp = require("gulp-webp");

//FONTS
// преобразование шрифтов
const fonts = () => {
  src("./src/fonts/**.ttf").pipe(ttf2woff()).pipe(dest("./app/fonts/"));
  return src("./src/fonts/**.ttf").pipe(ttf2woff2()).pipe(dest("./app/fonts/"));
};
// Функция для начертаний
const checkWeight = (fontname) => {
  let weight = 400;
  switch (true) {
    case /Thin/.test(fontname):
      weight = 100;
      break;
    case /ExtraLight/.test(fontname):
      weight = 200;
      break;
    case /Light/.test(fontname):
      weight = 300;
      break;
    case /Regular/.test(fontname):
      weight = 400;
      break;
    case /Medium/.test(fontname):
      weight = 500;
      break;
    case /SemiBold/.test(fontname):
      weight = 600;
      break;
    case /Semi/.test(fontname):
      weight = 600;
      break;
    case /Bold/.test(fontname):
      weight = 700;
      break;
    case /ExtraBold/.test(fontname):
      weight = 800;
      break;
    case /Heavy/.test(fontname):
      weight = 700;
      break;
    case /Black/.test(fontname):
      weight = 900;
      break;
    default:
      weight = 400;
  }
  return weight;
};

// автоматизация шрифтов
const cb = () => {};

let srcFonts = "./src/scss/_fonts.scss";
let appFonts = "./app/fonts/";

const fontsStyle = (done) => {
  let file_content = fs.readFileSync(srcFonts);

  fs.writeFile(srcFonts, "", cb);
  fs.readdir(appFonts, function (err, items) {
    if (items) {
      let c_fontname;
      for (var i = 0; i < items.length; i++) {
        let fontname = items[i].split(".");
        fontname = fontname[0];
        let font = fontname.split("-")[0];
        let weight = checkWeight(fontname);

        if (c_fontname != fontname) {
          fs.appendFile(srcFonts,'@include font-face("' + font + '","' + fontname + '", ' + weight + ');\r\n',cb
          );
        }
        c_fontname = fontname;
      }
    }
  });

  done();
};

//SVG SPRITES
const svgSprites = () => {
  return src("./src/img/svg/**.svg")
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../sprite.svg",
          },
        },
      })
    )
    .pipe(dest("./app/img"));
};

//sourcemap, rename, autoprefixer, cleanCss, browser-sync
const styles = () => {
  return src("./src/scss/**/*.scss")
    .pipe(sourcemap.init())
    .pipe(
      sass({
        outputStyle: "expanded",
      }).on("error", notify.onError())
    )
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(
      autoprefixer({
        cascade: false,
      })
    )
    .pipe(
      cleanCss({
        level: 2,
      })
    )
    .pipe(sourcemap.write("."))
    .pipe(dest("./app/css/"))
    .pipe(browserSync.stream());
};

//HTML
const htmlInclude = () => {
  return src(["./src/*.html"])
    .pipe(
      fileinclude({
        prefix: "@",
        basepath: "@file",
      })
    )
    .pipe(dest("./app"))
    .pipe(browserSync.stream());
};

//img to App for dev version
const imgToApp = () => {
  return src([
    "./src/img/**.jpg",
    "./src/img/**.png",
    "./src/img/**.jpeg",
  ]).pipe(dest("./app/img"));
};

// преобразование фотографий в webp
const webpImages = () => {
  return src(['./src/img/**.{jpg,png,jpeg}'])
  .pipe(webp())
  .pipe(dest('./app/img'))
  .on('end', () => {  // Добавляем обработчик события "end" после сохранения преобразованных файлов
    del(['./app/img/**.{jpg,png,jpeg}']);  // Удаляем оригинальные файлы
  })
  .pipe(browserSync.stream());
}

// Another files( for example: videos and etc.)
const resources = () => {
  return src("./src/resources/**").pipe(dest("./app"));
};

//Clean
const clean = () => {
  return del("app/*");
};

const scripts = () => {
  return src("./src/js/main.js")
    .pipe(
      webpackStream({
        output: {
          filename: "main.js",
        },
        module: {
          rules: [
            {
              test: /\.(?:js|mjs|cjs)$/,
              exclude: /node_modules/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: [["@babel/preset-env", { targets: "defaults" }]],
                },
              },
            },
          ],
        },
      })
    )
    .on("error", function (err) {
      console.error("WEBPACK ERROR", err);
      this.emit("end"); // Don't stop the rest of the task
    })
    .pipe(sourcemap.init())
    .pipe(uglify().on("error", notify.onError()))
    .pipe(sourcemap.write("."))
    .pipe(dest("./app/js"))
    .pipe(browserSync.stream());
};

//Уменешьшение веса картинок
const images = () => {
  return src(["./src/img/**.jpg", "./src/img/**.jpeg", "./src/img/**.png"])
    .pipe(image())
    .pipe(dest("./app/img"));
};

//watch files
const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: "./app",
    },
  });

  watch("./src/scss/**/*.scss", styles);
  watch("./src/*.html", htmlInclude);
  watch("./src/img/**.jpg", imgToApp);
  watch("./src/img/**.png", imgToApp);
  watch("./src/img/**.jpeg", imgToApp);
  watch("./src/img/svg/**.svg", svgSprites);
  watch("./src/resources/**", resources);
  watch("./src/fonts/**.ttf", fonts);
  watch("./src/fonts/**.ttf", fontsStyle);
  watch("./src/js/**/*.js", scripts);
  watch(['./src/img/**.{jpg,png,jpeg}'], webpImages)
};
exports.styles = styles;
exports.fileinclude = htmlInclude;
exports.watchFiles = watchFiles;

exports.default = series(
  clean,
  parallel(htmlInclude, scripts, fonts, imgToApp, svgSprites, resources),
  fontsStyle,
  styles,
  images,
  webpImages,
  watchFiles
);

//Build version (gulp build)
const stylesBuild = () => {
  return src("./src/scss/**/*.scss")
    .pipe(
      sass({
        outputStyle: "expanded",
      }).on("error", notify.onError())
    )
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(
      autoprefixer({
        cascade: false,
      })
    )
    .pipe(
      cleanCss({
        level: 2,
      })
    )
    .pipe(dest("./app/css/"));
};

const scriptsBuild = () => {
  return src("./src/js/main.js")
    .pipe(
      webpackStream({
        output: {
          filename: "main.js",
        },
        module: {
          rules: [
            {
              test: /\.(?:js|mjs|cjs)$/,
              exclude: /node_modules/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: [["@babel/preset-env", { targets: "defaults" }]],
                },
              },
            },
          ],
        },
      })
    )
    .on("error", function (err) {
      console.error("WEBPACK ERROR", err);
      this.emit("end"); // Don't stop the rest of the task
    })
    .pipe(uglify().on("error", notify.onError()))
    .pipe(dest("./app/js"));
};

//html minify Build version
const htmlMinify = ()=>{
  return src('app/**/*.html')
  .pipe(htmlmin({
    collapseWhitespace: true
  }))
  .pipe(dest('app'));
}

exports.build = series(
  clean,
  parallel(htmlInclude, scriptsBuild, fonts, imgToApp, svgSprites, resources),
  fontsStyle,
  stylesBuild,
  htmlMinify,
  images,
  webpImages
);

// Деплой сборки на сервер
const deploy = () => {
  let conn = ftp.create({
    host: "", //хост
    user: "", // имя
    password: "", // пароль
    parallel: 10,
    log: gutil.log,
  });

  let globs = ["app/**"];

  return src(globs, {
    base: "./app",
    buffer: false,
  })
    .pipe(conn.newer("")) // only upload newer files
    .pipe(conn.dest("")); // конечный путь
};

exports.deploy = deploy;
