var tagsData = [
    {
        'tag_color': 'Green',
        'tag_name': 'Relevant to the meaning',
        'tag_hotkey': 'm'
    },
    {
        'tag_color': 'Red',
        'tag_name': 'No clear meaning in description',
        'tag_hotkey': 'r'
    }
];

function extend(ParentClass, constructorFunction, prototypeHash) {
    constructorFunction = constructorFunction || function () {};
    prototypeHash = prototypeHash || {};
    if (ParentClass) {
        constructorFunction.prototype = Object.create(ParentClass.prototype);
    }
    for (var i in prototypeHash) {
        constructorFunction.prototype[i] = prototypeHash[i];
    }
    return constructorFunction;
}

exports.Task = extend(TolokaHandlebarsTask, function(options) {
    TolokaHandlebarsTask.call(this, options);
}, {
    getTemplateData: function() {
        var data = TolokaHandlebarsTask.prototype.getTemplateData.apply(this, arguments);
        data.tagsData = updateTagsData(tagsData);

        return data;
    },
    onRender: function() {
        var tagsData = this.getTask().input_values.tagsData;
        createTextAnnotationInterface.call(this, tagsData);

        var meaningInput = this.getDOMElement().querySelector("input[name='meaning']");
        meaningInput.addEventListener('paste', e => e.preventDefault());

        var commentInput = this.getDOMElement().querySelector("input[name='comment']");
        commentInput.addEventListener('paste', e => e.preventDefault());

        var reasonInput = this.getDOMElement().querySelector("input[name='reason']");
        reasonInput.addEventListener('paste', e => e.preventDefault());
    },
    addError: function(message, field, errors) {
        errors || (errors = {
            task_id: this.getOptions().task.id,
            errors: {}
        });
        errors.errors[field] = {
            message: message
        };

        return errors;
    },
    validate: function(solution) {
        var errors = null;
        var meaningDescription = solution.output_values.meaning;

        // Check if meaning is not annotated, but other fields are not filled
        if (!solution.output_values ||
            (Object.keys(solution.output_values).length === 0 || solution.output_values.result === undefined ||
                (Object.keys(solution.output_values.result || {}).length === 0 &&
                    (!solution.output_values.result["No clear meaning in description"] || !solution.output_values.comment)))) {
            errors = this.addError('Select at least one word or label "No clear meaning in description"', '__TASK__', errors);
        }

        // Check if both green and red labels are present
        if ((solution.output_values.result && solution.output_values.result["Relevant to the meaning"] && solution.output_values.result['No clear meaning in description']) || (solution.output_values.result && meaningDescription && solution.output_values.comment)) {
            errors = this.addError('Select either "Relevant to the meaning" or "No clear meaning in description" and fill corresponding comment box, not both.', '__TASK__', errors);
        }

        // Check if green label is used but no meaning is provided
        if (solution.output_values.result && solution.output_values.result['Relevant to the meaning'] && !meaningDescription) {
            errors = this.addError('If you select "Relevant to the meaning", please provide your own understanding of the meme.', '__TASK__', errors);
        }

        // Check if the length of the meaning description is shorter than 20 characters
        if (solution.output_values.result && solution.output_values.result['Relevant to the meaning'] && meaningDescription && meaningDescription.length < 20) {
            errors = this.addError('Your description of the meaning should be no shorter than 20 characters.', '__TASK__', errors);
        }

        // Check if red label is used but no comment is provided
        if (solution.output_values.result && solution.output_values.result['No clear meaning in description'] && !solution.output_values.comment) {
            errors = this.addError('If you select "No clear meaning in description", please provide a comment.', '__TASK__', errors);
        }

        // Check if the length of the meaning description is shorter than 20 characters
        if (solution.output_values.result && solution.output_values.result['No clear meaning in description'] && solution.output_values.comment && solution.output_values.comment.length < 15) {
            errors = this.addError('Your comment on lack of clear meaning in description of the meme should be no shorter than 15 characters.', '__TASK__', errors);
        }

        // Check if red label is used but Reason is not provided
        if (solution.output_values.result &&
            solution.output_values.result['No clear meaning in description'] &&
            !['not a meme', 'description not sufficient', 'other reason'].includes(solution.output_values.reason.toLowerCase())) {
            errors = this.addError('If you select "No clear meaning in description", please type one of the defined reasons.', '__TASK__',      errors);
        }

        // Check if IsRelatable input is equal to Yes or No
        if (solution.output_values.result && !['Yes', 'No', 'yes', 'no'].includes(solution.output_values.isRelatable)) {
            errors = this.addError('Answer the question with Yes or No.', '__TASK__', errors);
        }

        // Check if "No Clear Meaning" highlights the 3rd word of the 3rd sentence
        var memeDescription = this.getTask().input_values.description;
        var highlightedText = solution.output_values.result && solution.output_values.result['No clear meaning in description'];
        if (highlightedText && highlightedText.length > 0) {
            // Extract the 3rd word of the 3rd sentence from the meme description
            var thirdSentence = memeDescription.split('. ')[2];
            var secondSentence = memeDescription.split('. ')[1];
            var firstSentence = memeDescription.split('. ')[0];

            if (thirdSentence) {
                var thirdWord = thirdSentence.split(' ')[2];

                // Check if the highlighted text matches the 3rd word of the 3rd sentence
                if (!highlightedText.includes(thirdWord)) {
                    errors = this.addError('The "No clear meaning in description" tag should highlight the 3rd word of the 3rd sentence.', '__TASK__', errors);
                }
            } else if (secondSentence) {
                var thirdWord = secondSentence.split(' ')[2];

                // Check if the highlighted text matches the 3rd word of the 2nd sentence
                if (!highlightedText.includes(thirdWord)) {
                    errors = this.addError('The "No clear meaning in description" tag should highlight the 3rd word of the 2nd sentence.', '__TASK__', errors);
                }
            } else {
                var thirdWord = firstSentence.split(' ')[2];

                // Check if the highlighted text matches the 3rd word of the 1st sentence
                if (!highlightedText.includes(thirdWord)) {
                    errors = this.addError('The "No clear meaning in description" tag should highlight the 3rd word of the 1st sentence.', '__TASK__', errors);
                }
            }
        }

        // Additional checks
        // Check for minimum word count
        var wordCount = meaningDescription.split(/\s+/).length;
        if (wordCount < 3) {
            errors = this.addError('Please provide a more detailed response, at least 3 words.', '__TASK__', errors);
        }

        // Check for the presence of special characters
        var nonAlphabeticCharacters = meaningDescription.replace(/[a-zA-Z]/g, '').length;
        var percentageNonAlphabetic = (nonAlphabeticCharacters / meaningDescription.length) * 100;

        if (percentageNonAlphabetic > 15) {
            errors = this.addError('Avoid excessive use of special characters. Please enter a valid response.', '__TASK__', errors);
        }

        return errors || TolokaHandlebarsTask.prototype.validate.call(this, solution);
    },
    onDestroy: function() {
        // The task is completed, you can release global resources (if you used them)
    }
});