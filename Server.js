const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');
const path = require('path');
const CryptoJS = require("crypto-js");
const crypto = require('crypto');

const secretKey = 'S3cUr3D@cib0lc!K3yF0rMidlsrt17n0144';

function encryptPassword(password) {
    const ciphertext = CryptoJS.AES.encrypt(password, secretKey).toString();
    return ciphertext;
}

function decryptPassword(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
}

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    console.log(`\x1b[97mОдобрен запрос на получение данных с локального сервера: ${req.method} ${req.url}\x1b[37m`);
    next();
});

app.use((err, req, res, next) => {
    console.error(`\x1b[31mОшибка при отправке запроса на странице ${req.url} по следующей причине: ${err.message}\x1b[37m`);
    res.status(500).send('Ошибка Decibel Crm.');
});

app.get('/', (req, res) => {
  res.redirect('/wall');
});

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Функция для генерации случайного имени файла
const generateRandomFileName = (extension) => {
    return crypto.randomBytes(16).toString('hex') + extension; // Генерирует случайное имя файла
};

// Хранилище для обычных файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        // Проверяем, есть ли в имени файла английские буквы
        const hasEnglishLetters = /[a-zA-Z]/.test(file.originalname); // Проверка на английские буквы

        let newFileName;

        if (hasEnglishLetters) {
            // Если имя файла содержит английские буквы, используем оригинальное имя
            newFileName = file.originalname;
        } else {
            // Если английских букв нет, используем случайное имя
            newFileName = generateRandomFileName(path.extname(file.originalname));
        }

        cb(null, newFileName);
    }
});

// Хранилище для аватаров
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/profilepictures/');
    },
    filename: (req, file, cb) => {
        // Проверяем, есть ли в имени файла английские буквы
        const hasEnglishLetters = /[a-zA-Z]/.test(file.originalname); // Проверка на английские буквы

        let newFileName;

        if (hasEnglishLetters) {
            // Если имя файла содержит английские буквы, используем оригинальное имя
            newFileName = Date.now() + path.extname(file.originalname);
        } else {
            // Если английских букв нет, используем случайное имя
            newFileName = generateRandomFileName(path.extname(file.originalname));
        }

        cb(null, newFileName);
    }
});

// Загрузка обычных файлов
const upload = multer({ storage: storage });
// Загрузка аватаров
const uploadAvatar = multer({ storage: avatarStorage });

// Обработчик для загрузки файла
const uploadFile = (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(500).send("Ошибка при загрузке файла");
        }

        res.status(200).send(`Файл успешно загружен с именем ${req.file.filename}`);
    });
};

// Обработчик для загрузки аватара
const uploadAvatarFile = (req, res) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
        if (err) {
            return res.status(500).send("Ошибка при загрузке аватара");
        }

        res.status(200).send(`Аватар успешно загружен с именем ${req.file.filename}`);
    });
};

module.exports = {
    uploadFile,
    uploadAvatarFile
};


app.get('/rules', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'rules.html'));
});

app.get('/already', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'already.html'));
});

app.get('/loginbad', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'loginbad.html'));
});

app.get('/bot', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'bot.html'));
});

app.get('/donate', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'donate.html'));
});

// Регистрация пользователя
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/register', uploadAvatar.single('avatar'), (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const description = req.body.description;

    // Шифруем пароль
    const encryptedPassword = CryptoJS.AES.encrypt(password, secretKey).toString();
    
        const userFilePath = `data/users/${email}.txt`;
    
      // Проверяем, существует ли уже файл с таким email
    if (fs.existsSync(userFilePath)) {
        // Если файл существует, перенаправляем пользователя на маршрут /already
        return res.redirect('/already');
    }

    // Проверяем, был ли загружен файл аватара
    let avatarPath = '';
    if (req.file) {
        // Если файл был загружен, получаем его расширение и имя
        const avatarExtension = path.extname(req.file.originalname);
        const avatarFileName = `${email}${avatarExtension}`;

        // Устанавливаем путь к аватару
        avatarPath = `profilepictures/${avatarFileName}`;

        // Перемещаем файл аватара в нужную папку с правильным именем
        fs.renameSync(req.file.path, path.join('public/profilepictures/', avatarFileName));
    }

    // Создание строки с данными пользователя
    const userData = `Email: ${email}\nPassword: ${encryptedPassword}\nName: ${name}\nDescription: ${description}\nAvatar: ${avatarPath}\n`;

    // Записываем данные в файл
    fs.writeFile(`data/users/${email}.txt`, userData, (err) => {
        if (err) throw err;
        res.redirect('/login');
    });
});


const findAvatar = (email) => {
    const avatarDir = path.join(__dirname, 'Public', 'ProfilePictures'); // путь к директории аватаров
    const extensions = ['.jpg', '.jpeg', '.png', '.gif']; // возможные расширения аватаров
    let avatarFileName = null;

    // Проверяем наличие файлов с разными расширениями
    for (const ext of extensions) {
        const filePath = path.join(avatarDir, `${email}${ext}`);
        if (fs.existsSync(filePath)) {
            avatarFileName = `${email}${ext}`; // сохраняем имя файла
            break; // выходим из цикла, если нашли файл
        }
    }
    
    return avatarFileName; // возвращаем имя файла или null
};

app.get('/me', (req, res) => {
    // Проверка авторизации пользователя
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userEmail = req.session.user.email; // Получаем email пользователя
    const userFilePath = path.join(__dirname, 'Data', 'Users', `${userEmail}.txt`); // Путь к файлу пользователя
    const avatarFileName = findAvatar(userEmail); // Ищем аватар пользователя
    const avatarPath = avatarFileName ? `/ProfilePictures/${avatarFileName}` : ''; // Формируем путь к аватару

    fs.readFile(userFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка загрузки файла:', err);
            return res.status(500).send('Ошибка загрузки данных пользователя.');
        }

        // Парсим данные из файла
        const userData = {};
        const lines = data.split('\n');
        lines.forEach(line => {
            if (line.startsWith('Name:')) {
                userData.name = line.replace('Name:', '').trim(); // Извлекаем имя
            } else if (line.startsWith('Description:')) {
                userData.description = line.replace('Description:', '').trim(); // Извлекаем описание
            } else if (line.startsWith('Password:')) {
                userData.password = line.replace('Password:', '').trim(); // Извлекаем пароль
            }
        });

        // Расшифровка пароля
        const decryptedPassword = CryptoJS.AES.decrypt(userData.password, secretKey).toString(CryptoJS.enc.Utf8);
        userData.password = decryptedPassword; // Устанавливаем расшифрованный пароль

        // Определяем строку для верификации
        const verificationString = '&nbsp;<Img Src = "Images/Tick.svg" Width = "20Px" Height = "20Px"/>';
        
        // Удаляем строку с верификацией из имени, если она существует
        const verificationFound = userData.name.includes(verificationString.trim()); // Проверяем наличие строки
        userData.name = userData.name.replace(verificationString, '').trim(); // Удаляем тег из имени

        // Устанавливаем isVerified в зависимости от наличия verificationString в имени
        let isVerified = verificationFound; // Устанавливаем в true, если найден

        // Сообщение о верификации
        const verificationMessage = isVerified ? 'Пользователь верифицирован.' : 'Пользователь не верифицирован.'; 

        // Возврат страницы
        res.send(`
<!DocType Html>
<Html Lang = "Ru">
<Html>
<Head>
<Title>Decibel Crm</Title>
<Meta Http-Equiv = "Content-Type" Content = "Text/Html; Charset = Utf-8" />
<Meta Charset = "Utf-8">
<Link Rel = "StyleSheet" Type = "Text/Css" Href = "Css/MeCss.Css" Media = "Screen" />
<Meta Name = "Description" Content = "Отображение информации о вашем профиле Decibel Crm и её редактирование.">
<Meta Name = "KeyWords" ontent="Редактировать профиль, как изменить имя, Decibel Crm, как изменить пароль">
<Meta Name = "Author" Content = "Gleb Michailovich Sh.">
<Link Rel = "Icon" Type="Image/X-Icon" Href = "FavIcon/FavIcon.ico">
<Link Rel = "PreConnect" Href = "https://fonts.googleapis.com">
<Link Rel = "PreConnect" Href = "https://fonts.gstatic.com" CrossOrigin>
<Link Href = "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" Rel = "StyleSheet">
</Head>
<Body>
<Div Class = "TopLine"></Div>
<Div Class = "MainContent">
<Header>
<Div Class = "Logo">Decibel Crm</Div>
<Nav>
<Ul Class = "Menu">
<Li><A Href = "/Wall">Главная</A></Li>
<Li><A Href = "/Messages">Сообщения</A></Li>
<Li><A Href = "/Communities">Сообщества</A></Li>
<Li><A Href = "/Donate">Донат разработчику</A></Li>
<Li><A Href = "/Me">Мой аккаунт</A></Li>
</Ul>
</Nav>
</Header>
<Div Class = "Write">
<Div Class = "Set-Line-First">
${avatarFileName ? `<Img Src = "${avatarPath}" Alt = "Аватар" Width = "45Px" Height = "45Px"/>` : '<Img Src = "/Images/User.Svg" Alt = "Аватар" Width = "45Px" Height = "45Px"/>'}
<A>&nbsp;&nbsp;Мой аккаунт</A>
</Div>
<Form Action = "/me/update" Method = "POST" EncType = "multipart/form-data">

<Div Class = "Set-Line"><Div Class = "Set"><A>Имя аккаунта:</A></Div><Input Type = "text" Class = "Write-Input" Name = "name" PlaceHolder = "Введите отображаемое имя аккаунта." Value = "${userData.name}" Required></Div>

<Div Class = "Set-Line"><Div Class = "Set"><A>Пароль доступа:</A></Div><Input Type = "text" Class = "Write-Input" Name = "password" PlaceHolder = "Введите пароль для вашего аккаунта." Value = "${userData.password}" Required></Div>

<Div Class = "Set-Line"><Div Class = "Set"><A>Описание профиля:</A></Div><Input Type = "text" Class = "Write-Input" Name = "description" PlaceHolder = "Напишите описание вашего профиля." Value = "${userData.description}" Required></Div>

<Div Class = "Set-Line"><Div Class = "Set"><A>Ваш Email адрес:</A></Div><Input Type = "email" Class = "Write-Input" Name = "email" PlaceHolder = "Введите свой Email адрес." ReadOnly Value = "${userEmail}"></Div>

<Div Class = "Set-Line"><Div Class = "Set"><A>Состояние верификации:</A></Div><Input Type = "email" Class = "Write-Input" Name = "email" PlaceHolder = "Введите свой Email адрес." ReadOnly Value = "${verificationMessage}"></Div>

<Div Class = "Buttons-Container">
<Div Class = "File-Container">
<Input Type = "file" Name = "avatar" Id = "File-Input" Class = "File-Input">
<Label For = "File-Input" Class = "Custom-File-Label">
<Img Src = "Images/Avatar.Svg" Width = "20Px" Height = "20Px">
&nbsp;Выбрать аватар
</Label>
</Div>
<Div Class = "Right">
<A Href = "/logout"><Button Type = "Button" Class = "Write-Button"><Img Src = "/Images/Already.Svg" Width = "20Px" Height = "20Px"/>&nbsp;Выйти из акаунта</Button></A>
<Button Type = "submit" Class = "Write-Button"><Img Src = "/Images/Register.Svg" Width = "20Px" Height = "20Px"/>&nbsp;Сохранить</Button>
</Form>
</Div>
</Div>
</Div>
<Div Class = "Write" Id = "Top">
<Img Src = "/Images/Warning.Svg" Width = "24Px" Height = "24Px"/>
<A Id = "Warning">&nbsp;Внимание! После изменения имени профиля, закройте страницу и зайдите снова, либо заново войдите.</I></A>
</Div>
<Div Class = "Write" Id = "Top">
<Img Src = "/Images/Caution.Svg"/>
<A Id = "Warning" Href = "/Rules">&nbsp;Внимание! Регистрируясь и используя Decibel Crm, вы обязаны соблюдать <I>правила плафтормы.</I></A>
</Div>
<script>
 document.addEventListener("DOMContentLoaded", function() {
    function updatePublicationHeights() {
        // Получаем все блоки с классом Write
        let publications = document.querySelectorAll('.Write');
        
        publications.forEach(function(publication) {
            let totalHeight = 0;

            // Получаем все непосредственные дочерние элементы внутри блока Write
            let children = publication.children;
            
            // Суммируем высоту всех детей, кроме изображений и видео
            for (let child of children) {
                // Если это не блок с изображением и не блок с видео, добавляем его высоту
                if (!child.classList.contains('Publication-Image') && !child.classList.contains('Publication-Video')) {
                    totalHeight += child.offsetHeight;
                }
            }

            // Проверяем, есть ли изображение внутри блока
            let imgElement = publication.querySelector('#Publication-Image');
            if (imgElement) {
                // Добавляем высоту изображения
                totalHeight += imgElement.offsetHeight;
            }

            // Проверяем, есть ли видео внутри блока
            let videoElement = publication.querySelector('#Publication-Video');
            if (videoElement) {
                // Добавляем высоту видео
                totalHeight += videoElement.offsetHeight;
            }
            
            // Добавляем 15 пикселей для отступов
            totalHeight += 15;
            
            // Устанавливаем вычисленную высоту для конкретного блока Write
            publication.style.height = totalHeight + 'px';
        });
    }

    // Выполняем код каждую секунду (1000 мс)
    setInterval(updatePublicationHeights, 1000);
  });
</script>
</Body>
</Html>
        `);
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack); // Логировать стек ошибок
    res.status(500).send('Decibel Crm Internal JavaScript Server Error. Для получения дополнительной информации обратитесь к Telegram боту Decibel Crm.');
});

app.post('/me/update', upload.single('avatar'), (req, res) => {
    const userEmail = req.session.user.email; // Получаем email пользователя
    const userFilePath = path.join(__dirname, 'Data', 'Users', `${userEmail}.txt`); // Путь к файлу пользователя

    // Считываем текущие данные пользователя из файла
    fs.readFile(userFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка загрузки файла:', err);
            return res.status(500).send('Ошибка обновления данных пользователя.');
        }

        // Парсим данные из файла
        const userData = {};
        const lines = data.split('\n');
        lines.forEach((line) => {
            if (line.startsWith('Name:')) {
                userData.name = line.replace('Name:', '').trim(); // Извлекаем имя
            } else if (line.startsWith('Description:')) {
                userData.description = line.replace('Description:', '').trim(); // Извлекаем описание
            } else if (line.startsWith('Password:')) {
                userData.password = line.replace('Password:', '').trim(); // Извлекаем пароль
            }
            // Добавьте здесь любые другие строки, которые нужно сохранить без изменений
        });

        // Сохраняем текущее имя и описание
        const currentImageTag = userData.name.match(/<img[^>]*>/g); // Проверяем, есть ли тег <img>
        const newName = req.body.name.trim();
        const newDescription = req.body.description.trim();
        const newPassword = req.body.password.trim();

        // Обновляем имя, сохраняя тег <img>, если он есть
        if (currentImageTag) {
            userData.name = `${newName} ${currentImageTag[0]}`; // Оставляем тег <img> нетронутым
        } else {
            userData.name = newName;
        }

        // Обновляем описание
        if (newDescription) {
            userData.description = newDescription;
        }

        // Шифруем новый пароль, если он был изменен
        if (newPassword) {
            userData.password = CryptoJS.AES.encrypt(newPassword, secretKey).toString(); // Шифруем пароль
        }

        // Формируем обновленные данные
        const updatedLines = lines.map(line => {
            if (line.startsWith('Name:')) {
                return `Name: ${userData.name}`;
            } else if (line.startsWith('Description:')) {
                return `Description: ${userData.description}`;
            } else if (line.startsWith('Password:')) {
                return `Password: ${userData.password}`; // Записываем зашифрованный пароль
            }
            return line; // Остальные строки остаются без изменений
        });

        // Записываем обновленные данные обратно в файл
        const updatedData = updatedLines.join('\n'); // Объединяем строки обратно в текст
        fs.writeFile(userFilePath, updatedData, 'utf8', (err) => {
            if (err) {
                console.error('Ошибка записи данных:', err);
                return res.status(500).send('Ошибка обновления данных пользователя.');
            }

            // Обработка аватара
            if (req.file) {
                const avatarDir = path.join(__dirname, 'Public', 'ProfilePictures');
                const newAvatarPath = path.join(avatarDir, `${userEmail}${path.extname(req.file.originalname)}`); // Новый путь для аватара

                fs.rename(req.file.path, newAvatarPath, (err) => { // Перемещаем загруженный файл
                    if (err) {
                        console.error('Ошибка замены аватара:', err);
                        return res.status(500).send('Ошибка замены аватара.');
                    }
                });
            }

            res.redirect('/me'); // Перенаправление на страницу пользователя
        });
    });
});

// Вход в аккаунт
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    fs.readFile(`data/users/${email}.txt`, 'utf8', (err, data) => {
        if (err) {
            return res.send('Пользователь не найден!');
        }

        const storedPassword = data.split('\n')[1].split(': ')[1]; // Извлекаем зашифрованный пароль
        const name = data.split('\n')[2].split(': ')[1];

        // Дешифровка пароля
        const decryptedPassword = CryptoJS.AES.decrypt(storedPassword, secretKey).toString(CryptoJS.enc.Utf8);

        // Сравнение паролей
        if (decryptedPassword === password) {
            req.session.user = { email, name };
            res.redirect('/wall');
        } else {
            res.redirect('/loginbad');
        }
    });
});

app.get('/wall', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { name } = req.session.user;
    const postsPerPage = 10; // Количество постов на странице
    fs.readdir('data/posts/', (err, files) => {
        if (err) throw err;

        // Сортируем файлы по их имени (числовое значение), чтобы старые посты были первыми
        const sortedFiles = files.sort((a, b) => {
            return parseInt(a) - parseInt(b); // Сравниваем как числа (от старых к новым)
        });

        const totalPages = Math.ceil(sortedFiles.length / postsPerPage); // Общее количество страниц
        let page = parseInt(req.query.page) || totalPages; // Текущая страница, по умолчанию — последняя (самые новые посты)

        // Ограничиваем номер страницы, чтобы он был в пределах допустимого диапазона
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        // Определяем индексы постов для текущей страницы
        const startIndex = (page - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;
        const currentPosts = sortedFiles.slice(startIndex, endIndex).reverse(); // Для отображения на странице сортируем от новых к старым


        let postsHtml = currentPosts.map(file => {
            const post = fs.readFileSync(`data/posts/${file}`, 'utf8');
            const postLines = post.split('\n');
            const user = postLines[0].split(': ')[1]; // Имя пользователя
            const email = postLines[1].split(': ')[1]; // Email пользователя
            const date = postLines.find(line => line.startsWith('Date:')).split(': ')[1]; // Дата
            const time = postLines.find(line => line.startsWith('Time:')).split(': ')[1]; // Время

            const formattedTime = time.slice(0, 5); // Оставляем только ЧЧ:ММ
            const formattedDate = `${date} в ${formattedTime}`; // Форматирование для отображения

            const avatarPath = fs.existsSync(`public/profilepictures/${email}.jpg`) 
                ? `/ProfilePictures/${email}.jpg`
                : '/Images/User.Svg'; // Если аватар не найден, используем изображение по умолчанию

            const message = postLines[2].split(': ')[1];

            // Получаем лайки и дизлайки
            let likes = 0;
            let dislikes = 0;
            const likesLine = postLines.find(line => line.startsWith('Likes:'));
            const dislikesLine = postLines.find(line => line.startsWith('Dislikes:'));

            if (likesLine) likes = parseInt(likesLine.split(': ')[1]);
            if (dislikesLine) dislikes = parseInt(dislikesLine.split(': ')[1]);

            let postHtml = `<Div Class = "Publication">
                <Div Class = "Publication-User">
                    <Img Src = "${avatarPath}" Width = "45Px" Height = "45Px"/>
                    <A Id = "Publication-Name">&nbsp;${user}</A>
                    <A Id = "Publication-Time">${formattedDate}</A>
                </Div>`;

            // Если есть файл в посте
            const imageLine = postLines.find(line => line.startsWith('Image:'));
            if (imageLine) {
                const fileName = imageLine.split(': ')[1];
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const uniqueId = fileName.split('.')[0]; // Используем уникальное имя для элементов аудиоплеера
                const stats = fs.statSync(`public/uploads/${fileName}`);
const fileSizeInBytes = stats.size;
const fileSizeInKB = (fileSizeInBytes / 1024 / 1024).toFixed(2);
const fileExtensionUpper = fileExtension.toUpperCase(); // Преобразуем расширение в верхний регистр



                  // Проверяем, является ли файл аудио
    if (fileExtension === 'mp3' || fileExtension === 'wav') {
        postHtml += `
        <Div Class="Publication-Audio" Id = "Audio-Height">
            <Audio Id="audio-player-${uniqueId}">
                <Source Src="/uploads/${fileName}" Type="audio/${fileExtension}">
                Ваш браузер не поддерживает воспроизведение аудио.
            </Audio>
            <Div Class="Controls" Id="Audio-Height-${uniqueId}">
                <Button Class="Write-Button" Id="play-pause-btn-${uniqueId}">
                    <Img Src="Images/Play.Svg" Width="20Px" Height="20Px"/>&nbsp;Старт
                </Button>
                <Input Type="Range" Class = "Seek-Bar" Id="seek-bar-${uniqueId}" Value="0" Min="0" Step="0.1">
                <Div Class="Margin-No">
                    <Span Id="current-time-${uniqueId}">00:00</Span><Span>&nbsp;из&nbsp;</Span>
                    <Span Id="duration-${uniqueId}" Style="Margin-Right: 7Px;">00:00</Span>
                </Div>
<Div Class = "New-Line">
        <Button Class="Write-Button" Id="Download-Button-${uniqueId}" data-file="/uploads/${fileName}">
            <Img Src="Images/Download.Svg" Width="20Px" Height="20Px"/>&nbsp;Скачать
        </Button>
</Div>
            </Div>
        </Div>`;

        // Добавляем уникальный скрипт для управления аудиоплеером
        postHtml += `
        <Script>
            document.addEventListener("DOMContentLoaded", function() {
                const audioPlayer_${uniqueId} = document.getElementById('audio-player-${uniqueId}');
                const playPauseBtn_${uniqueId} = document.getElementById('play-pause-btn-${uniqueId}');
                const seekBar_${uniqueId} = document.getElementById('seek-bar-${uniqueId}');
                const currentTimeDisplay_${uniqueId} = document.getElementById('current-time-${uniqueId}');
                const durationDisplay_${uniqueId} = document.getElementById('duration-${uniqueId}');
                
                // Функция для форматирования времени
                function formatTime_${uniqueId}(seconds) {
                    const minutes = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
                }

                // Инициализируем кнопку воспроизведения/паузы
                playPauseBtn_${uniqueId}.addEventListener('click', function() {
                    if (audioPlayer_${uniqueId}.paused) {
                        audioPlayer_${uniqueId}.play();
                        playPauseBtn_${uniqueId}.innerHTML = '<Img Src="Images/Pause.Svg"/>&nbsp;Пауза';
                    } else {
                        audioPlayer_${uniqueId}.pause();
                        playPauseBtn_${uniqueId}.innerHTML = '<Img Src="Images/Play.Svg"/>&nbsp;Старт';
                    }
                });

                // Обновляем время и ползунок при воспроизведении
                audioPlayer_${uniqueId}.addEventListener('timeupdate', function() {
                    const currentTime = audioPlayer_${uniqueId}.currentTime;
                    const duration = audioPlayer_${uniqueId}.duration;
                    currentTimeDisplay_${uniqueId}.textContent = formatTime_${uniqueId}(currentTime);
                    durationDisplay_${uniqueId}.textContent = formatTime_${uniqueId}(duration);
                    seekBar_${uniqueId}.max = duration;
                    seekBar_${uniqueId}.value = currentTime;
                    const percentage = (currentTime / duration) * 100;
                    seekBar_${uniqueId}.style.setProperty('--seek-bar-value', percentage + '%');
                });

                // Обновляем текущее время по ползунку
                seekBar_${uniqueId}.addEventListener('input', function() {
                    audioPlayer_${uniqueId}.currentTime = this.value;
                });
 // Скачивание файла при нажатии на кнопку
                const downloadBtn_${uniqueId} = document.getElementById('Download-Button-${uniqueId}');
                downloadBtn_${uniqueId}.addEventListener('click', function() {
                    const fileUrl = downloadBtn_${uniqueId}.getAttribute('data-file');
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = '_${fileName}';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            });
        </Script>
`;
                } else if (fileExtension === 'jpg' || fileExtension === 'png' || fileExtension === 'gif') {
                    // Если это не аудио, считаем это изображением
                    postHtml += `
                        <Div Class = "Publication-Image">
                            <Img Src="/uploads/${fileName}" Alt="Изображение поста" Id="Publication-Image"/>
                        </Div>`;
                } 
                else if (fileExtension === 'mp4' || fileExtension === 'avi') {
					                const uniqueId = fileName.split('.')[0];
                    postHtml += `
                        <Div Class = "Publication-Video">
<div class="VideoPlayer">
        <video id="Video-${uniqueId}" class="Video" src="/uploads/${fileName}"></video>

        <div class="Controls">
            <button id="PlayPauseButton-${uniqueId}" class="PlayPauseButton">
                <img id="PlayPauseIcon-${uniqueId}" src="Images/Video.Svg" Width = "20Px" Height = "20Px" alt="Play"><span id="Text-${uniqueId}" class="Text">Старт</span>
            </button>



            <div class="ProgressBar">
                <div id="ProgressFill-${uniqueId}" class="ProgressFill"></div>
            </div>

            <span id="CurrentTime-${uniqueId}" class="CurrentTime">0:00</span>&nbsp;из&nbsp;
            <span id="TotalTime-${uniqueId}" class="TotalTime">0:00</span>

            <a href="/uploads/${fileName}" download class="DownloadButton"><Img Src = "Images/DownloadVideo.Svg" Width = "20Px" Height = "20Px"/></a>
<a id="FullscreenButton-${uniqueId}" class="FullScreenButton"><Img Src = "Images/FullScreen.Svg" Width = "20Px" Height = "20Px"/></a>
        </div>
    </div>

<Script>
const Video_${uniqueId} = document.getElementById('Video-${uniqueId}');
const PlayPauseButton_${uniqueId} = document.getElementById('PlayPauseButton-${uniqueId}');
const PlayPauseIcon_${uniqueId} = document.getElementById('PlayPauseIcon-${uniqueId}');
const Text_${uniqueId} = document.getElementById('Text-${uniqueId}');
const ProgressBar_${uniqueId} = document.querySelector('.ProgressBar');
const ProgressFill_${uniqueId} = document.getElementById('ProgressFill-${uniqueId}');
const CurrentTime_${uniqueId} = document.getElementById('CurrentTime-${uniqueId}');
const TotalTime_${uniqueId} = document.getElementById('TotalTime-${uniqueId}');
const FullscreenButton_${uniqueId} = document.getElementById('FullscreenButton-${uniqueId}');

// Обновляем иконку и текст при смене состояния
PlayPauseButton_${uniqueId}.addEventListener('click', () => {
    if (Video_${uniqueId}.paused) {
        Video_${uniqueId}.play();
        PlayPauseIcon_${uniqueId}.src = 'Images/Pause.Svg';
        Text_${uniqueId}.textContent = 'Пауза';
    } else {
        Video_${uniqueId}.pause();
        PlayPauseIcon_${uniqueId}.src = 'Images/Video.Svg';
        Text_${uniqueId}.textContent = 'Старт';
    }
});

// Обновляем полосу прогресса и время
Video_${uniqueId}.addEventListener('timeupdate', () => {
    const ProgressPercent_${uniqueId} = (Video_${uniqueId}.currentTime / Video_${uniqueId}.duration) * 100;
    ProgressFill_${uniqueId}.style.width = ProgressPercent_${uniqueId} + '%';

    // Обновляем текущее время
    const MinutesElapsed_${uniqueId} = Math.floor(Video_${uniqueId}.currentTime / 60);
    const SecondsElapsed_${uniqueId} = Math.floor(Video_${uniqueId}.currentTime % 60);
    CurrentTime_${uniqueId}.textContent = MinutesElapsed_${uniqueId} + ':' + (SecondsElapsed_${uniqueId} < 10 ? '0' + SecondsElapsed_${uniqueId} : SecondsElapsed_${uniqueId});

    // Обновляем общее время
    const MinutesTotal_${uniqueId} = Math.floor(Video_${uniqueId}.duration / 60);
    const SecondsTotal_${uniqueId} = Math.floor(Video_${uniqueId}.duration % 60);
    TotalTime_${uniqueId}.textContent = MinutesTotal_${uniqueId} + ':' + (SecondsTotal_${uniqueId} < 10 ? '0' + SecondsTotal_${uniqueId} : SecondsTotal_${uniqueId});
});

// Перемотка видео при нажатии на полосу прогресса
ProgressBar_${uniqueId}.addEventListener('click', (e) => {
    const ClickRatio = e.offsetX / ProgressBar_${uniqueId}.offsetWidth;
    Video_${uniqueId}.currentTime = ClickRatio * Video_${uniqueId}.duration;
});

// Переключение полноэкранного режима
FullscreenButton_${uniqueId}.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        if (Video_${uniqueId}.requestFullscreen) {
            Video_${uniqueId}.requestFullscreen();
        } else if (Video_${uniqueId}.webkitRequestFullscreen) { // Для Safari
            Video_${uniqueId}.webkitRequestFullscreen();
        } else if (Video_${uniqueId}.msRequestFullscreen) { // Для IE/Edge
            Video_${uniqueId}.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Для Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // Для IE/Edge
            document.msExitFullscreen();
        }
    }
});

</Script>
                        </Div>`;
                } else {
                    // Если это другой тип файла
                    postHtml += `
                    <Div Class = "Publication-Audio" Id = "Audio-Height">
<Div Class="Controls-File">
<Div Class = "Control">
<Img Src = "Images/Folder.Svg" Width="20Px" Height="20Px"/>&nbsp;<A>Прикреплённый файл: ${fileName}&nbsp;</A>&nbsp;</Div>
<Div Class = "Control">
<Img Src = "Images/Size.Svg"/ Width="20Px" Height="20Px"> <A>&nbsp;Размер: ${fileSizeInKB} Мб &nbsp;</A></Div>
<Div Class = "Control">
<Img Src = "Images/Extension.Svg"/ Width="20Px" Height="20Px"> <A>&nbsp;Раширение: ${fileExtensionUpper}</A></Div>
                      <A Href="/uploads/${fileName}" Download="${fileName}" Class="File-Button">
                    <Img Src="Images/Download.Svg" Width="20Px" Height="20Px"/>&nbsp;Скачать
                </A></Div></Div>
                        `;
                }
            }

            postHtml += `
                <Div Class = "Publication-Text"><A Id="Publication-Text">${message}</A></Div>
                <Div Class = "Publication-Actions">
				<button onclick="toggleComments(this)" class="Write-Button" id="Left-Button"><Img Src = "Images/Comments.Svg" Width = "20Px" Height = "20Px"/>&nbsp;Комментарии</Button>`;
				 
    

				
				// Проверяем, является ли текущий пользователь автором поста или у него админ-аккаунт
const currentUserEmail = req.session.user.email; 
const isAdmin = currentUserEmail === 'DecibelMeta@Gmail.com';
const isAuthor = currentUserEmail === email;

if (isAdmin || isAuthor) {
    postHtml += `
        <Button onclick="deletePost('${file}')"Id="Delete-Button">
            <Img Src="Images/Delete.Svg" Width="20Px" Height="20Px"/>
        </Button>
		`;
}
postHtml += `
				
                    <Button onclick="likePost('${file}')" Class="Write-Button" Id="Send-Button">
                        <Img Src="Images/Like.Svg" Width="20Px" Height="20Px"/>&nbsp;Нравится (${likes})
                    </Button>
                    <Button onclick="dislikePost('${file}')" Class="Write-Button" Id="Send-Button">
                        <Img Src="Images/DisLike.Svg" Width="20Px" Height="20Px"/>&nbsp;Не Нравится (${dislikes})
                    </Button></div>`;
					
			// Получение комментариев к посту
let commentsHtml = '';
const commentsPath = `data/comments/${file}`;

if (fs.existsSync(commentsPath)) {
    const comments = fs.readFileSync(commentsPath, 'utf8').split('\n').filter(Boolean);
    
    commentsHtml = comments.map(comment => {
        const [commentDateTime, commentText, commentEmail] = comment.split(' | ');

        // Определяем путь к папке users для получения имени
        const userProfilePath = `data/users/${commentEmail}.txt`;
        let userName = 'Неизвестный пользователь';  // Значение по умолчанию
        let userAvatar = '/public/profilepictures/default-avatar.png';  // Значение по умолчанию для аватара

        // Если файл с данными пользователя существует
if (fs.existsSync(userProfilePath)) {
    const userData = fs.readFileSync(userProfilePath, 'utf8');
    const userLines = userData.split('\n').filter(Boolean);  // Разделяем файл на строки
    
    // Ищем строку, начинающуюся с "Name:"
    const nameLine = userLines.find(line => line.startsWith('Name:'));
    
    if (nameLine) {
        // Извлекаем имя, удаляя "Name: " из строки
        userName = nameLine.replace('Name: ', '').trim();  // Получаем имя пользователя
    } else {
        console.log(`Строка с именем не найдена в файле: ${userProfilePath}`);
    }
} else {
    console.log(`Файл пользователя не найден: ${userProfilePath}`);
}
// Путь к папке с аватарами
const avatarPathJpg = `public/profilepictures/${commentEmail}.jpg`;
const avatarPathPng = `public/profilepictures/${commentEmail}.png`;

let avatarUrl = '';

if (fs.existsSync(avatarPathJpg)) {
    avatarUrl = `/profilepictures/${commentEmail}.jpg`;
} else if (fs.existsSync(avatarPathPng)) {
    avatarUrl = `/profilepictures/${commentEmail}.png`;
} else {
    console.log(`Аватар не найден для: ${commentEmail}`);
}

        // Генерируем HTML для каждого комментария
        return `<Div Class = "Comment" Id = "Comment">
		<Div Class = "Publication-User">
<Img Src = "${avatarUrl}" Alt = "Аватар" Class = "Avatar">
                    <A Id = "Publication-Name">${userName}</A><A Id = "Publication-Time">${commentDateTime}</A></Div>
                    <Div Class = "Publication-Text"><A>${commentText}</A></Div>
                </div>`;
    }).join('');
}

postHtml += `<Br><Br><Div Class = "Comments hide">${commentsHtml}<Form Action = "/comment" Method = "POST">
                <Input Type = "Hidden" Name = "postFile" Value = "${file}"/>
                <Input Id = "Write-Input-Comment" Name = "commentText" PlaceHolder = "Напишите ваш комментарий к этому посту."></Input>
                <Button Class = "Write-Button" Id = "Send-Button-Comment" Type = "submit"><Img Src = "Images/Comment.Svg" Width = "20Px" Height = "20Px"/>&nbsp;Отправить</Button>
             </Form></Div></Div>`;
return postHtml;




            return postHtml;
        }).join('');
		
		
        
        // Создаем кнопки "Назад" и "Вперёд"
        let navigationButtons = '';
        
        if (endIndex < sortedFiles.length) {
            navigationButtons += `<Button Class = "Write-Button" Id = "Left-Button-Next" Onclick = "loadPage(${page + 1})">Вперёд</button>`;
        }
                if (page > 1) {
            navigationButtons += `<Button Class = "Write-Button" Id = "Left-Button-Next" Onclick = "loadPage(${page - 1})">Назад</Button>`;
        }
        
        res.send(`
<!DocType Html>
<Html>
<Head>
<Title>Decibel Crm</Title>
<Meta Http-Equiv = "Content-Type" Content = "Text/Html; Charset = Utf-8" />
<Link Rel = "StyleSheet" Type = "Text/Css" Href = "Css/MainCss.Css" Media = "Screen" />

<Meta Name = "Description" Content = "Decibel Crm — новая социальная сеть для простого, понятного и быстрого общения с функциями файлообменника.">
<Meta Name = "KeyWords" ontent="Социальная сеть, общение, новости, обмен сообщениями.">
<Meta Name = "Author" Content = "Gleb Michailovich Sh.">

<Link Rel = "Icon" Type="Image/X-Icon" Href = "FavIcon/FavIcon.ico">
<Link Rel = "PreConnect" Href = "https://fonts.googleapis.com">
<Link Rel = "PreConnect" Href = "https://fonts.gstatic.com" CrossOrigin>
<Link Href = "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" Rel = "StyleSheet">
</Head>
<Body>
<Div Class = "TopLine"></Div>
<Div Class = "MainContent">
<Header>
<Div Class = "Logo">Decibel Crm</Div>
<Nav>
<Ul Class = "Menu">
<Li><A Href = "/Wall">Главная</A></Li>
<Li><A Href = "/Messages">Сообщения</A></Li>
<Li><A Href = "/Communities">Сообщества</A></Li>
<Li><A Href = "/Donate">Донат разработчику</A></Li>
<Li><A Href = "/Me">Мой аккаунт</A></Li>
</Ul>
</Nav>
</Header>
<Div Class = "Write">
<Form Action = "/post" Method = "POST" EncType = "multipart/form-data">
<Input Name = "message" Type = "Text" Id = "Write-Input" PlaceHolder = "Напишите Содержимое Вашей Публикации." Required></Input>
<Div Class = "Button-Flex">
<Div Class = "File-Container">
<Input Type = "file" Name = "image" Id = "File-Input" Class = "File-Input">
<Label For = "File-Input" Class = "Custom-File-Label">
<Img Src = "Images/File.Svg" Width = "20Px" Height = "20Px">
Прикрепить файл
</Label>
</Div>
<Button Class = "Write-Button" Id = "Send-Button"><Img Src = "Images/Send.Svg" Width= "20Px" Height = "20Px"/>Отправить</Button>
</Form>
</Div>
</Div>
<Script>
  document.addEventListener("DOMContentLoaded", function() {
    function updatePublicationHeights() {
        // Получаем все блоки с классом Publication
        let publications = document.querySelectorAll('.Publication');
        
        publications.forEach(function(publication) {
            let totalHeight = 0;

            // Получаем все непосредственные дочерние элементы внутри блока Publication
            let children = publication.children;
            
            // Суммируем высоту всех детей, кроме изображения
            for (let child of children) {
                // Если это не блок с изображением, добавляем его высоту
                if (!child.classList.contains('Publication-Image')) {
                    totalHeight += child.offsetHeight;
                }
            }

            // Проверяем, есть ли изображение внутри блока
            let imgElement = publication.querySelector('#Publication-Image');
            if (imgElement) {
                // Добавляем высоту изображения
                totalHeight += imgElement.offsetHeight;
            }

            // Проверяем, есть ли изображение внутри блока
            let audioElement = publication.querySelector('#Audio-Height');
            if (audioElement) {
                // Добавляем высоту изображения
                totalHeight += 10;
            }
			
            // Добавляем 60 пикселей
            totalHeight += 60;
            
            // Устанавливаем вычисленную высоту для конкретного блока Publication
            publication.style.height = totalHeight + 'px';
        });
    }

    setInterval(updatePublicationHeights, 90);
});

</Script>

 <Script>
        function toggleComments(button) {
            const container = button.closest('.Publication'); // Находим родительский контейнер
            const comments = container.querySelector('.Comments'); // Находим блок .Comments внутри контейнера
            comments.classList.toggle('hide'); // Переключаем класс hide
        }
    </Script>

<!-- <h1>На данной странице используется аккаунт ${name}!</h1> -->

${postsHtml} <!-- Список постов -->
${navigationButtons} <!-- Кнопки навигации  -->

<Div Class = "Footer">
<Img Src = "Images/Node.png" Width = "20Px" Height = "20Px"/>
<A>&nbsp;Node.Js 12.22.7, база данных Admin Crm от Decibel. Все данные сайта хранятся на собственном сервере Decibel Projct в Республике Беларусь.</A>
</Div>

<Script>

function likePost(file) {
fetch('/like/' + file, { method: 'POST' })
.then(() => window.location.reload());
}

function dislikePost(file) {
fetch('/dislike/' + file, { method: 'POST' })
.then(() => window.location.reload());
}

function loadPage(newPage) {
window.location.href = '/wall?page=' + newPage;
}

function deletePost(file) {
    fetch('/delete/' + file, { method: 'POST' })
        .then(() => window.location.reload());
}


</Script>

</Body>
</Html>

        `);
    });
});

app.post('/comment', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { postFile, commentText } = req.body;
    const { name, email } = req.session.user;  // Добавляем email пользователя из сессии

    // Получаем текущую дату и время
    const now = new Date();
    const formattedDateTime = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()} в ${now.getHours()}:${now.getMinutes()}`;

    const commentsPath = `data/comments/${postFile}`;
    const comment = `${formattedDateTime} | ${commentText} | ${email}\n`;

    // Сохраняем комментарий
    fs.appendFile(commentsPath, comment, (err) => {
        if (err) throw err;
        res.redirect('/wall');
    });
});



app.post('/delete/:file', (req, res) => {
    if (!req.session.user) {
        return res.status(403).send('Unauthorized');
    }

    const currentUserEmail = req.session.user.email;
    const postFile = `data/posts/${req.params.file}`;
    const postData = fs.readFileSync(postFile, 'utf8');
    const postEmail = postData.split('\n')[1].split(': ')[1]; // Получаем email из поста
    
    // Проверяем права на удаление
    if (currentUserEmail === postEmail || currentUserEmail === 'decibelmeta@gmail.com') {
        fs.unlinkSync(postFile); // Удаляем файл
        res.status(200).send('Post deleted');
    } else {
        res.status(403).send('Forbidden');
    }
});


app.post('/post', upload.single('image'), (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { name, email } = req.session.user;
    const message = req.body.message;
    const image = req.file ? req.file.originalname : null; // Используем исходное имя файла

    const postId = Date.now(); // Генерируем уникальный ID для поста
    const date = new Date();
    
    // Формат даты с большой буквы
    const months = [
        "января", "февраля", "марта", "апреля", "мая", "июня", 
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()].charAt(0).toUpperCase() + months[date.getMonth()].slice(1);
    const year = date.getFullYear();

    const formattedDate = `${day} ${month} ${year}`;
    const formattedTime = date.toTimeString().split(' ')[0]; // Часы:Минуты:Секунды

    // Собираем содержимое поста
    let postContent = `User: ${name}\nEmail: ${email}\nMessage: ${message}\nDate: ${formattedDate}\nTime: ${formattedTime}\nLikes: 0\nDislikes: 0\n`;

    if (image) {
        postContent += `Image: ${image}`; // Добавляем имя файла
    }

    // Сохраняем пост в файл
    fs.writeFileSync(`data/posts/${postId}.txt`, postContent, 'utf8');

    res.redirect('/wall');
});

const usersDirectory = path.join(__dirname, 'data/users');
const chatsDirectory = path.join(__dirname, 'data/chats');
const profilePicturesUrl = '/profilepictures/'; // Путь для отображения аватаров на фронтенде
const profilePicturesDirectory = path.join(__dirname, 'public/profilepictures');
const defaultAvatarUrl = '/images/user.svg'; // Относительный путь к аватару по умолчанию

// Функция для поиска аватара с разными расширениями
function findAvatarByEmail(email) {
    const avatarExtensions = ['png', 'jpg', 'jpeg'];
    const avatarPath = avatarExtensions
        .map(ext => path.join(profilePicturesDirectory, `${email}.${ext}`))
        .find(filePath => fs.existsSync(filePath));
    return avatarPath ? `${profilePicturesUrl}${email}.${path.extname(avatarPath).slice(1)}` : defaultAvatarUrl;
}

// Маршрут для страницы сообщений
app.get('/messages', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { name, email } = req.session.user;

    // Проверяем наличие аватара у текущего пользователя
    const userAvatar = findAvatarByEmail(email);

    // Получаем список файлов чатов текущего пользователя
    const currentUserChatFolder = path.join(chatsDirectory, email);
    const chatFiles = fs.existsSync(currentUserChatFolder) ? fs.readdirSync(currentUserChatFolder) : [];

    // Генерация HTML для блоков чатов
    const chatBlocksHtml = chatFiles.map(file => {
        const otherUserEmail = path.basename(file, '.txt'); // Получаем email другого пользователя из имени файла
        const otherUserAvatar = findAvatarByEmail(otherUserEmail); // Находим аватар другого пользователя

        // Получаем имя собеседника из файла
        const otherUserNamePath = path.join(usersDirectory, `${otherUserEmail}.txt`);
        let otherUserName = otherUserEmail.split('@')[0]; // Используем часть email как имя по умолчанию

        if (fs.existsSync(otherUserNamePath)) {
            const userData = fs.readFileSync(otherUserNamePath, 'utf8').split('\n');
            const nameLine = userData.find(line => line.startsWith('Name:')); // Ищем строку "Name:"
            if (nameLine) {
                otherUserName = nameLine.split(': ')[1].trim(); // Извлекаем имя после "Name:"
            }
        }

        return `
            <a href="/chat/${otherUserEmail}" class="Chat-Block">
                <img src="${otherUserAvatar}" Class="Avatar">
                <span class="Name">&nbsp;${otherUserName}</span>
            </a>
        `;
    }).join('');

    res.send(`
  	<!DocType Html>
<Html>
<Head>
<Title>Decibel Crm</Title>
<Meta Http-Equiv = "Content-Type" Content = "Text/Html; Charset = Utf-8" />
<Link Rel = "StyleSheet" Type = "Text/Css" Href = "../../Css/ChatCss.Css" Media = "Screen" />

<Meta Name = "Description" Content = "Decibel Crm — новая социальная сеть для простого, понятного и быстрого общения с функциями файлообменника.">
<Meta Name = "KeyWords" ontent="Социальная сеть, общение, новости, обмен сообщениями.">
<Meta Name = "Author" Content = "Gleb Michailovich Sh.">

<Link Rel = "Icon" Type="Image/X-Icon" Href = "FavIcon/FavIcon.ico">
<Link Rel = "PreConnect" Href = "https://fonts.googleapis.com">
<Link Rel = "PreConnect" Href = "https://fonts.gstatic.com" CrossOrigin>
<Link Href = "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" Rel = "StyleSheet">
</Head>
<Body>
<Div Class = "TopLine"></Div>
<Div Class = "MainContent">
<Header>
<Div Class = "Logo">Decibel Crm</Div>
<Nav>
<Ul Class = "Menu">
<Li><A Href = "/Wall">Главная</A></Li>
<Li><A Href = "/Messages">Сообщения</A></Li>
<Li><A Href = "/Communities">Сообщества</A></Li>
<Li><A Href = "/Donate">Донат разработчику</A></Li>
<Li><A Href = "/Me">Мой аккаунт</A></Li>
</Ul>
</Nav>
</Header>
<Div Class = "Write">
            <div class="Container">

                    <div class="User-Info">
                        <img src="${userAvatar}" alt="Аватар пользователя" class="Avatar">                    
                        <A Class = "Name">&nbsp;${name}</h2>
                    </div>
                    <button id="createChatButton" class="Write-Button">Создать чат</button>
            </div>

                <!-- Блоки чатов -->
                <div class="chat-list">
                    ${chatBlocksHtml}
                </div>

                <!-- Модальное окно для создания чата -->
                <div id="createChatModal" class="modal">
                    <div class="modal-content">
                        <form id="createChatForm" action="/create-chat" method="POST">
                            <input type="email" id="Write-Input-Email" name="recipientEmail" required PlaceHolder = "Введите Email собеседника.">
                            <button type="submit" class="btn" Id = "sendMessageButton2">Создать</button>
                        </form>
                    </div>
                </div>
            </div>

            <script>
                // Открытие модального окна
                const createChatButton = document.getElementById('createChatButton');
                const createChatModal = document.getElementById('createChatModal');
                const closeModal = document.getElementById('closeModal');

                createChatButton.addEventListener('click', () => {
                    createChatModal.style.display = 'block';
                });

                closeModal.addEventListener('click', () => {
                    createChatModal.style.display = 'none';
                });

                // Закрытие модального окна при клике вне его области
                window.onclick = (event) => {
                    if (event.target === createChatModal) {
                        createChatModal.style.display = 'none';
                    }
                };
            </script>
			</Div>
        </body>
        </html>
    `);
});

// Маршрут для страницы чата
app.get('/chat/:email', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { email: currentUserEmail } = req.session.user;
    const otherUserEmail = req.params.email;

    const currentUserChatFile = path.join(chatsDirectory, currentUserEmail, `${otherUserEmail}.txt`);

const otherUserAvatar = findAvatarByEmail(otherUserEmail); // Находим аватар другого пользователя

        // Получаем имя собеседника из файла
        const otherUserNamePath = path.join(usersDirectory, `${otherUserEmail}.txt`);
        let otherUserName = otherUserEmail.split('@')[0]; // Используем часть email как имя по умолчанию

        if (fs.existsSync(otherUserNamePath)) {
            const userData = fs.readFileSync(otherUserNamePath, 'utf8').split('\n');
            const nameLine = userData.find(line => line.startsWith('Name:')); // Ищем строку "Name:"
            if (nameLine) {
                otherUserName = nameLine.split(': ')[1].trim(); // Извлекаем имя после "Name:"
            }
        }
    // Читаем содержимое чата из файла текущего пользователя
    let messages = [];
    if (fs.existsSync(currentUserChatFile)) {
        const fileContent = fs.readFileSync(currentUserChatFile, 'utf8').trim();

        if (fileContent) {
            // Считываем каждую строку как отдельное сообщение
            messages = fileContent.split('\n').map(line => {
                // Используем регулярное выражение для разбивки строки на части
                const regex = /^\[(.*?)\] (.*?): (.*)$/; // Формат: [2024-10-17 10:00:00] user@example.com: сообщение
                const match = line.match(regex);

                if (match) {
                    const timestamp = match[1]; // Время
                    const senderEmail = match[2]; // Email отправителя
                    const messageText = match[3]; // Сообщение

                    return { timestamp, senderEmail, messageText };
                }
                return null;
            }).filter(Boolean);
        }
    }

    // Генерация HTML для сообщений
    const messagesHtml = messages.map(({ timestamp, senderEmail, messageText }) => {
        const isCurrentUser = senderEmail === currentUserEmail;
        const messageClass = isCurrentUser ? 'my-message' : 'other-message';
        const alignmentClass = isCurrentUser ? 'align-right' : 'align-left'; // Выравнивание сообщений
        return `
            <div class="message ${messageClass} ${alignmentClass}">
                <span class="timestamp">${timestamp}</span>
                <p>${messageText}</p>
            </div>
        `;
    }).join('');

    res.send(`
	<!DocType Html>
<Html>
<Head>
<Title>Decibel Crm</Title>
<Meta Http-Equiv = "Content-Type" Content = "Text/Html; Charset = Utf-8" />
<Link Rel = "StyleSheet" Type = "Text/Css" Href = "../../Css/ChatCss.Css" Media = "Screen" />

<Meta Name = "Description" Content = "Decibel Crm — новая социальная сеть для простого, понятного и быстрого общения с функциями файлообменника.">
<Meta Name = "KeyWords" ontent="Социальная сеть, общение, новости, обмен сообщениями.">
<Meta Name = "Author" Content = "Gleb Michailovich Sh.">

<Link Rel = "Icon" Type="Image/X-Icon" Href = "FavIcon/FavIcon.ico">
<Link Rel = "PreConnect" Href = "https://fonts.googleapis.com">
<Link Rel = "PreConnect" Href = "https://fonts.gstatic.com" CrossOrigin>
<Link Href = "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" Rel = "StyleSheet">
</Head>
<Body>
<Div Class = "TopLine"></Div>
<Div Class = "MainContent">
<Header>
<Div Class = "Logo">Decibel Crm</Div>
<Nav>
<Ul Class = "Menu">
<Li><A Href = "/Wall">Главная</A></Li>
<Li><A Href = "/Messages">Сообщения</A></Li>
<Li><A Href = "/Communities">Сообщества</A></Li>
<Li><A Href = "/Donate">Донат разработчику</A></Li>
<Li><A Href = "/Me">Мой аккаунт</A></Li>
</Ul>
</Nav>
</Header>
<Div Class = "Write">
      
            <div class="Chat-Window">
                <!-- Добавляем информацию о собеседнике: аватар и имя -->
                <div class="User-Info">
                    <img src="${otherUserAvatar}" alt="Аватар" class="Avatar">
                    <span class="Name">&nbsp;${otherUserName}</span>
                </div>

                <!-- Список сообщений -->
                <div class="Message-List" id="messageList">
                    ${messagesHtml} <!-- Вставляем сообщения здесь -->
                </div>

                <!-- Поле для ввода сообщения и кнопка отправки -->
                <div class="Input-Section">
                    <input type="text" id="messageInput" placeholder="Введите ваше сообщение..." />
                    <button id="sendMessageButton" onclick="reloadPage()"><Img Src = "../../Images/Send.Svg" Width = "20Px" Height = "20Px"/>&nbsp;Отправить</button>
                </div>
            </div>
			</Div>
			<Script>
                   document.addEventListener('DOMContentLoaded', function() {
                    function setFullHeight() {
                        var writeBlock = document.querySelector('.Write');
                        var headerBlock = document.querySelector('header');
                        var topLineBlock = document.querySelector('.TopLine');
                        var inputBlock = document.querySelector('.Input-Section');

                        if (writeBlock && headerBlock && inputBlock && topLineBlock) {
                            // Получаем высоту окна
                            var windowHeight = window.innerHeight;

                            // Получаем высоту header и TopLine с учетом margin и padding
                            var headerHeight = headerBlock.offsetHeight + getVerticalMarginPadding(headerBlock);
                            var topLineHeight = topLineBlock.offsetHeight + getVerticalMarginPadding(topLineBlock);

                            // Получаем высоту input блока с учетом margin и padding
                            var inputHeight = inputBlock.offsetHeight + getVerticalMarginPadding(inputBlock);

                            // Устанавливаем высоту для блока .Write, отняв высоту header, TopLine и input
                            writeBlock.style.height = (windowHeight - headerHeight - topLineHeight - inputHeight) + 'px';
                        }
                    }

                    // Функция для расчета суммарных вертикальных отступов (margin + padding)
                    function getVerticalMarginPadding(element) {
                        var style = window.getComputedStyle(element);
                        var marginTop = parseInt(style.marginTop);
                        var marginBottom = parseInt(style.marginBottom);
                        var paddingTop = parseInt(style.paddingTop);
                        var paddingBottom = parseInt(style.paddingBottom);
                        return marginTop + marginBottom + paddingTop + paddingBottom;
                    }

                    // Устанавливаем высоту при загрузке страницы
                    setFullHeight();

                    // Также обновляем высоту при изменении размера окна
                    window.addEventListener('resize', setFullHeight);
                });
			</Script>
			    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Получаем блоки
            var block1 = document.querySelector('.Write');
            var block2 = document.querySelector('.Input-Section');

            if (block1 && block2) {
                // Получаем высоту блока 2
                var block2Height = block2.offsetHeight;

                // Устанавливаем ту же высоту для блока 1
                block1.style.height = block2Height + 'px';
            }
        });
    </script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const scrollableDiv = document.getElementById('messageList');
    scrollableDiv.scrollTop = scrollableDiv.scrollHeight; // Прокручиваем вниз
});

</script>
            <script>
                document.getElementById('sendMessageButton').addEventListener('click', function() {
                    const messageInput = document.getElementById('messageInput');
                    const messageText = messageInput.value.trim();
                    const recipientEmail = '${otherUserEmail}';

                    if (messageText === '') {
                        alert('Пожалуйста, введите сообщение.');
                        return;
                    }

                    fetch('/send-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            recipientEmail: recipientEmail,
                            messageText: messageText
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            messageInput.value = ''; // Очистить поле ввода
                        } else {
                            alert(data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка:', error);
                    });
                });
            </script>
			<script>
			function reloadPage() {
    setTimeout(function() {
        location.reload();
    }, 1000); // Задержка в 1 секунду (1000 миллисекунд)
}
</script>
        </body>
        </html>
    `);
});






// Функция для получения текущего времени в нужном формате
function getCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}

app.post('/send-message', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // Определяем адреса электронной почты
    const senderEmail = req.session.user.email; // Email текущего пользователя (отправителя)
    const recipientEmail = req.body.recipientEmail; // Email получателя
    const messageText = req.body.messageText; // Текст сообщения

    // Проверка на заполненность полей
    if (!recipientEmail || !messageText || !messageText.trim()) {
        return res.json({ success: false, message: 'Пожалуйста, заполните все поля.' });
    }

    // Генерация строки сообщения
    const timestamp = getCurrentTimestamp();
    const messageLine = `${timestamp} ${senderEmail}: ${messageText.trim()}\n`;

    // Пути к файлам чатов
    const senderChatFile = path.join(chatsDirectory, senderEmail, `${recipientEmail}.txt`);
    const recipientChatFile = path.join(chatsDirectory, recipientEmail, `${senderEmail}.txt`);

    try {
        // Запись сообщения в файл текущего пользователя (в его чат с собеседником)
        fs.appendFileSync(senderChatFile, messageLine, 'utf8');

        // Логируем email собеседника для отладки
        console.log(`Отправлено сообщение пользователю: ${recipientEmail}`);

        // Запись сообщения в файл собеседника (в его чат с текущим пользователем)
        fs.appendFileSync(recipientChatFile, messageLine, 'utf8');
	res.redirect('/chat/:${recipientEmail}');
        // Ответ об успешной отправке сообщения (без перезагрузки страницы)
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при записи сообщения:', error);
        res.json({ success: false, message: 'Ошибка при отправке сообщения.' });
    }
});



// Маршрут для создания нового чата
app.post('/create-chat', (req, res) => {
    const { email: currentUserEmail } = req.session.user;
    const { recipientEmail } = req.body;

    const currentUserChatFile = path.join(chatsDirectory, currentUserEmail, `${recipientEmail}.txt`);

    if (!fs.existsSync(currentUserChatFile)) {
        fs.writeFileSync(currentUserChatFile, ''); // Создаем пустой файл для чата, если его нет
    }

    const recipientChatFile = path.join(chatsDirectory, recipientEmail, `${currentUserEmail}.txt`);
    if (!fs.existsSync(recipientChatFile)) {
        fs.writeFileSync(recipientChatFile, ''); // Создаем пустой файл для чата у собеседника
    }

    res.redirect('/messages'); // Возвращаемся на страницу с чатами
});

// Обработка лайков
app.post('/like/:file', (req, res) => {
    const file = req.params.file;
    const filePath = `data/posts/${file}`;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Ошибка при обработке лайка.');
        }

        const lines = data.split('\n');
        let likesLine = lines.find(line => line.startsWith('Likes:'));
        let likes = parseInt(likesLine.split(': ')[1]);

        likes += 1; // Увеличиваем лайки

        const newContent = lines.map(line => line.startsWith('Likes:') ? `Likes: ${likes}` : line).join('\n');

        fs.writeFile(filePath, newContent, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Ошибка при сохранении лайка.');
            }
            res.status(200).send('Лайк добавлен.');
        });
    });
});

// Обработка дизлайков
app.post('/dislike/:file', (req, res) => {
    const file = req.params.file;
    const filePath = `data/posts/${file}`;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Ошибка при обработке дизлайка.');
        }

        const lines = data.split('\n');
        let dislikesLine = lines.find(line => line.startsWith('Dislikes:'));
        let dislikes = parseInt(dislikesLine.split(': ')[1]);

        dislikes += 1; // Увеличиваем дизлайки

        const newContent = lines.map(line => line.startsWith('Dislikes:') ? `Dislikes: ${dislikes}` : line).join('\n');

        fs.writeFile(filePath, newContent, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Ошибка при сохранении дизлайка.');
            }
            res.status(200).send('Дизлайк добавлен.');
        });
    });
});

// Выход из аккаунта
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Ошибка при выходе из системы.');
        }
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
