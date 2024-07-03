const Book = require("../models/Book");
const fs = require("fs");

exports.createBook = (req, res, next) => {
  // Parse l'objet livre à partir du corps de la requête
  const bookObject = JSON.parse(req.body.book);
  
  // Supprime les champs _id et _userId de l'objet livre pour éviter tout conflit ou mauvais usage
  delete bookObject._id;
  delete bookObject._userId;
  
  // Crée le nouveau livre à partir du modèle Book en utilisant les données de l'objet de la requête
  // et en ajoutant l'ID de l'utilisateur authentifié et l'URL de l'image qui sont traité par les middle auth et multer
  const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
  });

  // Enregistrement du nouveau livre dans la base de données
  book
    .save()
    .then(() => {
      res.status(201).json({ message: "Livre enregistré !" });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.getAllBooks = (req, res, next) => {
  // Cherche tous les livres dans la base de données
  Book.find()
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.getOneBook = (req, res, next) => {
  // Cherche un livre dans la base de données avec le param id de la requête
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      res.status(200).json(book);
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file
    ? {
        // Si un fichier est téléchargé, parse l'objet livre depuis le corps de la requête
        ...JSON.parse(req.body.book),
        // Met à jour l'URL de l'image avec le nouveau fichier
        imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
      }
    : {
        // Sinon on utilise simplement le corps de la requête
        ...req.body,
      };

  // Supprime le champ _userId pour éviter toute modification non autorisée comme pour create
  delete bookObject._userId;

  // Cherche le livre à modifier par son ID
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      // Vérifie si l'utilisateur authentifié est le propriétaire du livre
      if (book.userId != req.auth.userId) {
        return res.status(401).json({ message: "Not authorized" });
      }

      // Si un fichier a été téléchargé, supprime l'ancienne image
      if (req.file) {
        const oldImageUrl = book.imageUrl;
        const filename = oldImageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, (err) => {
          if (err) console.error(err);
        });
      }

      // Mise à jour du livre avec les nouvelles informations
      Book.updateOne(
        { _id: req.params.id },
        { ...bookObject, _id: req.params.id }
      )
        .then(() => {
          res.status(200).json({ message: "Livre modifié!" });
        })
        .catch((error) => {
          res.status(401).json({ error });
        });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteBook = (req, res, next) => {
  // Cherche le livre à supprimer par son ID
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      // Vérifie si l'utilisateur authentifié est le propriétaire du livre
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        // Récupère le nom du fichier de l'image
        const filename = book.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {         // Supprime le fichier de l'image
          Book.deleteOne({ _id: req.params.id })// Supprime le livre de la base de données
            .then(() => {
              res.status(200).json({ message: "Livre supprimé !" });
            })
            .catch((error) => {
              res.status(401).json({ error });
            });
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.bestRating = (req, res, next) => {
  Book.find()// Cherche tous les livres dans la base de données
    .sort({ averageRating: -1 })// Trie les livres par note moyenne décroissante et limite le résultat à 3 livres
    .limit(3) // Limite à trois objets la liste
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.addRating = (req, res, next) => {
  const grade = req.body.rating; // Récupère la note de la requête
  const userId = req.auth.userId; // Récupère l'ID de l'utilisateur authentifié

  // Vérifie que l'ID de l'utilisateur et la note sont fournis
  if (!userId || grade === undefined) {
    return res.status(400).json({ error: "UserId and grade are required." });
  }

  Book.findOne({ _id: req.params.id }) // Cherche le livre par son ID
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found." });
      }
      
      const existingRating = book.ratings.find( // Vérifie si l'utilisateur a déjà noté ce livre
        (rating) => rating.userId === userId
      );
      if (existingRating) {
        // Si c'est le cas, renvoie une réponse 400 "L'utilisateur a déjà noté ce livre"
        return res
          .status(400)
          .json({ error: "User has already rated this book." });
      }
      book.ratings.push({ userId, grade }); // Ajoute la nouvelle note
      const totalRatings = book.ratings.length; // Calcule la nouvelle note moyenne
      const sumRatings = book.ratings.reduce(
        (sum, rating) => sum + rating.grade,
        0
      );
      book.averageRating = sumRatings / totalRatings;
      return book.save(); // Sauvegarde les changements
    })
    .then((updatedBook) => {
      res.status(200).json(updatedBook);
    })
    .catch((error) => {
      res.status(500).json({ error: "An error occurred while rating the book." });
    });
};
