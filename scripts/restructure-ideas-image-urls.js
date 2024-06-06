const db = require('../db');

// Function to update image URLs
async function updateImageUrls() {
    try {
        // Find all ideas where the extraData column is not null
        const ideas = await db.Idea.findAll({
            where: {
                extraData: {
                [Op.ne]: null
                }
            }
        });

        for (let idea of ideas) {
            // Find all the ideas where extraData.images contains an array
            if (idea.extraData && idea.extraData.images && Array.isArray(idea.extraData.images)) {
                let updated = false;
                // Go through all the images in the array
                idea.extraData.images = idea.extraData.images.map(url => {
                    if (url.startsWith('https://image.openstad.amsterdam.nl/image/')) {
                        updated = true;
                        const imageId = url.split('/').pop();
                        return `https://openstad.amsterdam.nl/image/image/${imageId}`;
                    }
                    return url;
                });

                if (updated) {
                    await idea.save();
                    console.log(`Updated images for idea ID: ${idea.id}. The new image-URL's are: ${idea.extraData.images}`);
                }
            }
        }

        console.log('Image URL update process completed.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await db.close();
    }
}

// Execute the function
updateImageUrls();