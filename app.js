const BASE_URL = 'https://api.harvardartmuseums.org';
const KEY = '890759f4-211d-4cb0-8ed0-4ca9b18b0bb3';

async function fetchObjects() {
    const url = `${BASE_URL}/object?apikey=${KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

fetchObjects()
    .then(x => console.log(x));

async function fetchAllCenturies() {
    const url = `${BASE_URL}/century?apikey=${KEY}&size=100&sort=temporalorder`;

    if(localStorage.getItem('centuries')) {
        return JSON.parse(localStorage.getItem('centuries'));
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        const records = data.records;

        localStorage.setItem('centuries', JSON.stringify(records));

        return records;

    } catch (error) {
        console.error(error);
    }
}

fetchAllCenturies();

async function fetchAllClassifications() {
    const url = `${BASE_URL}/classification?apikey=${KEY}&size=100&sort=name`;

    if(localStorage.getItem('classifications')) {
        return JSON.parse(localStorage.getItem('classifications'));
    }
    try {
        const response = await fetch(url);
        const data = await response.json();
        const records = data.records;

        localStorage.setItem('classifications', JSON.stringify(records));

        return records;

    } catch (error) {
        console.error(error);
    }
}

fetchAllClassifications();

async function prefetchCategoryLists() {
    try {
        const [
            classifications, centuries
        ] = await Promise.all([
            fetchAllClassifications(),
            fetchAllCenturies()
        ]);

        $('.classification-count').text(`(${classifications.length})`);

        classifications.forEach(classification => {
            $('#select-classification')
                .append($(`<option value="${classification.name}">${classification.name}</option>`));
        });
    
        $('.century-count').text(`(${centuries.length})`);
    
        centuries.forEach(century => {
            $('#select-century')
                .append($(`<option value="${century.name}">${century.name}</option>`));
        });
    } catch (error) {
        console.error(error);
    }
}

prefetchCategoryLists();

function buildSearchString() {
    const selectClass = $('#select-classification').val();
    const selectCentury = $('#select-century').val();
    const keywords = $('#keywords').val();

    const url = `${BASE_URL}/object?apikey=${KEY}&classification=${selectClass}&century=${selectCentury}&keyword=${keywords}`;

    const encodeUrl = encodeURI(url);

    return encodeUrl;
}

$('#search').on('submit', async function(event) {
    event.preventDefault();
    onFetchStart();

    try {
        const response = await fetch(buildSearchString());
        const {records, info} = await response.json();
        updatePreview({records, info});

    } catch (error) {
        console.error(error)
    } finally {
        onFetchEnd();
    }
});

function onFetchStart() {
    $('#loading').addClass('active');
}

function onFetchEnd() {
    $('#loading').removeClass('active');
}

function renderPreview(record) {
    const {
        title,
        description,
        primaryimageurl
    } = record

    let titleHtml;
    let descriptionHtml;
    let imageHtml;

    if (title) {
        titleHtml = `<h3>${title}</h3>`;
    }

    if (description) {
        descriptionHtml = `<h3>${description}</h3>`
    }

    if(primaryimageurl) {
        imageHtml = `<img src="${primaryimageurl}"></img>`;
    }

    return $(`
        <div class="object-preview">
            <a href="#">
                ${imageHtml ? imageHtml : ''} 
                ${titleHtml ? titleHtml : ''}
                ${descriptionHtml ? descriptionHtml : ''}
            </a>
        </div>
    `)
    .data('record', record);
}

function updatePreview({records, info}) {
    const root = $('#preview');

    if(info.next) {
        root.find('.next')
            .data('url', info.next)
            .attr('disabled', false);
    } else {
        root.find('.next')
            .data('url', null)
            .attr('disabled', true);
    }

    if(info.prev) {
        root.find('.previous')
            .data('url', info.prev)
            .attr('disabled', false);
    } else {
        root.find('.previous')
            .data('url', null)
            .attr('disabled', true);
    }

    const resultsElement = root.find('.results');

    resultsElement.empty();

    records.forEach(record => {
        resultsElement.append(
            renderPreview(record)
        );
    });
};

$('#preview .next, #preview .previous').on('click', async function() {
    console.log('$(this) IS:', $(this));
    console.log("WE ARE HERE");

    onFetchStart();

    try {
        const url = $(this).data('url');
        const response = await fetch(url);
        const {records, info} = await response.json();

        updatePreview({records, info});
    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
});

$('#preview').on('click', '.object-preview', function(event) {
    event.preventDefault();

    const objectRecord = $(this).data('record');
    const featureElement = $('#feature');

    featureElement.html(renderFeature(objectRecord))
});

function renderFeature(record) {
    const {
        title,
        dated,
        description,
        culture,
        style,
        technique,
        medium,
        dimensions,
        people,
        department,
        division,
        contact,
        images,
        primaryimageurl
    } = record;

    return $(`
        <div class="object-feature">
            <header>
                <h3>${title}<h3>
                <h4>${dated}</h4>
            </header>
        <section class="facts">
            ${factHTML('Description', description)}
            ${factHTML('Culture', culture, 'culture')}
            ${factHTML('Style', style)}
            ${factHTML('Technique', technique, 'technique' )}
            ${factHTML('Medium', medium ? medium.toLowerCase() : null, 'medium')}
            ${factHTML('Dimensions', dimensions)}
            ${people ? people.map(person => 
                factHTML('Person', person.displayname, 'person')
                )
                .join('') : ''}
            ${factHTML('Department', department)}
            ${factHTML('Division', division)}
            ${factHTML('Contact', `<a target="_blank" href="mailto:${contact}">${contact}</a>`)}
        </section>
        <section class="photos">
            ${photosHTML(images, primaryimageurl)}
        </section>
        </div>
    `);
}

function factHTML(title, content, searchTerm = null) {
    const url = `${BASE_URL}/object?apikey=${KEY}`;

    if(!content) {
        return '';
    }

    return `
        <span class="title">${title}</span>
        <span class="content">${
            searchTerm && content ?
                `<a href="${url}&${searchTerm}=${encodeURI(content)}">${content}</a>` : content}
        </span>
    `
}

function photosHTML(images, primaryimageurl) {
    if(images.length > 0) {
        return images.map(image =>
            `<img src="${image.baseimageurl}"/>`)
            .join('');
    } else if (primaryimageurl) {
        return `<img src="${primaryimageurl}"/>`;
    } else {
        return '';
    }
}

$('#feature').on('click', 'a', async function (event) {
    const href = $(this).attr('href');
  
    if (href.startsWith('mailto:')) {
      return;
    }
  
    event.preventDefault();
  
    onFetchStart();
    try {
      let result = await fetch(href);
      let {records, info} = await result.json();
      updatePreview({records, info});
    } catch (error) {
      console.error(error)
    } finally {
      onFetchEnd();
    }
});